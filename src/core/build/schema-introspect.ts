/**
 * valibot スキーマを歩いて TypeScript の型テキストを作る (ADR 9)。
 *
 * `<Stdin mode="json" schema={...}>` のエスケープハッチのためだけに使う。
 * JSX は型を運べない (ADR 9) ので、渡された**実オブジェクト**を読む。
 *
 * valibot を import しないのは意図的で、`type` 文字列で分岐するだけで足りる。
 * これにより valibot への依存は src/core/validation/ に閉じたままになる (ADR 10)。
 */
import { quoteKey, wrapUnion } from '../types/type-text.ts';

/** unknown に落ちた箇所 */
export interface UnsupportedNode {
  /** 位置 (`$`, `$.a`, `$[]`) */
  path: string;
  /** valibot の type、または pipe のアクション名 */
  node: string;
  /** 追加の理由 */
  detail?: string;
}

export interface SchemaTypeResult {
  text: string;
  /** 空なら全部の型を出力できた */
  unsupported: UnsupportedNode[];
}

/** 読みたいプロパティだけを持つ、valibot スキーマの最小形 */
interface SchemaLike {
  kind: string;
  type: string;
  async?: boolean;
  pipe?: unknown[];
  item?: unknown;
  items?: unknown;
  entries?: Record<string, unknown>;
  wrapped?: unknown;
  options?: unknown[];
  literal?: unknown;
  default?: unknown;
  '~standard'?: { vendor?: string };
}

/** valibot のスキーマかどうか */
export function isValibotSchema(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as SchemaLike;
  return (
    candidate.kind === 'schema' &&
    typeof candidate.type === 'string' &&
    candidate['~standard']?.vendor === 'valibot'
  );
}

/** async なスキーマ (safeParse が同期なので受け付けられない) */
export function isAsyncSchema(value: unknown): boolean {
  return isValibotSchema(value) && (value as SchemaLike).async === true;
}

/**
 * `pipe` の中に「出力の型を変えるアクション」があれば、その名前を返す。
 *
 * `v.pipe(base, ...)` は base の浅いコピー + `pipe` 配列で、**入れ子の pipe は
 * 平坦化されない**。1 段だけ見ると
 * `v.pipe(v.pipe(v.string(), v.transform(Number)), v.minValue(0))` の transform を
 * 取りこぼして誤った型 (`string`) を出してしまうので、`pipe[0]` を再帰的に辿る。
 */
function findTransformation(schema: SchemaLike): string | undefined {
  const pipe = schema.pipe;
  if (!Array.isArray(pipe) || pipe.length === 0) return undefined;

  const [base, ...actions] = pipe;
  if (base !== undefined && base !== schema && isValibotSchema(base)) {
    const nested = findTransformation(base as SchemaLike);
    if (nested !== undefined) return nested;
  }

  for (const action of actions) {
    if (typeof action !== 'object' || action === null) continue;
    const { kind, type } = action as { kind?: unknown; type?: unknown };
    // validation は型を変えず、metadata は型に影響しない
    if (kind === 'transformation') {
      return typeof type === 'string' ? type : 'transformation';
    }
  }
  return undefined;
}

/** リテラル値を型テキストに */
function literalText(value: unknown): string | undefined {
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return Number.isFinite(value) ? String(value) : undefined;
    case 'boolean':
      return String(value);
    case 'bigint':
      // JSON.stringify は bigint で例外を投げるので自分で組む
      return `${value}n`;
    default:
      return value === null ? 'null' : undefined;
  }
}

const DEFAULT_MAX_DEPTH = 20;

interface Context {
  unsupported: UnsupportedNode[];
  maxDepth: number;
  /** 再帰スタック (循環の保険。union などの共有は誤検出しない) */
  stack: Set<object>;
}

export function schemaToTypeText(
  schema: unknown,
  options: { maxDepth?: number } = {}
): SchemaTypeResult {
  const context: Context = {
    unsupported: [],
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    stack: new Set(),
  };
  const text = emit(schema, '$', 0, context);
  return { text, unsupported: context.unsupported };
}

function giveUp(
  path: string,
  node: string,
  context: Context,
  detail?: string
): string {
  context.unsupported.push({
    path,
    node,
    ...(detail === undefined ? {} : { detail }),
  });
  return 'unknown';
}

function emit(
  value: unknown,
  path: string,
  depth: number,
  context: Context
): string {
  if (depth > context.maxDepth) {
    return giveUp(path, '', context, 'depth limit exceeded');
  }
  if (!isValibotSchema(value)) {
    return giveUp(path, '', context, 'not a valibot schema');
  }

  const schema = value as SchemaLike;
  const object = value as object;
  if (context.stack.has(object)) {
    return giveUp(path, schema.type, context, 'circular reference');
  }

  const transformation = findTransformation(schema);
  if (transformation !== undefined) {
    return giveUp(path, transformation, context);
  }
  if (schema.async === true) {
    return giveUp(path, schema.type, context, 'async schema');
  }

  context.stack.add(object);
  try {
    return emitByType(schema, path, depth, context);
  } finally {
    context.stack.delete(object);
  }
}

function emitByType(
  schema: SchemaLike,
  path: string,
  depth: number,
  context: Context
): string {
  switch (schema.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'unknown':
    case 'any':
    case 'null':
    case 'undefined':
      return schema.type === 'any' ? 'unknown' : schema.type;
    case 'date':
      return 'Date';
    case 'literal': {
      const text = literalText(schema.literal);
      return text ?? giveUp(path, 'literal', context, 'unsupported literal');
    }
    case 'picklist':
    case 'enum': {
      const values = schema.options ?? [];
      const texts = values.map(literalText);
      if (texts.some((text) => text === undefined) || texts.length === 0) {
        return giveUp(path, schema.type, context, 'unsupported literal');
      }
      return texts.join(' | ');
    }
    case 'array':
      return `${wrapUnion(emit(schema.item, `${path}[]`, depth + 1, context))}[]`;
    case 'object':
    case 'loose_object':
      return emitObject(schema, path, depth, context);
    case 'optional':
    case 'exact_optional':
      return `${emit(schema.wrapped, path, depth + 1, context)} | undefined`;
    case 'nullable':
      return `${emit(schema.wrapped, path, depth + 1, context)} | null`;
    case 'nullish':
      return `${emit(schema.wrapped, path, depth + 1, context)} | null | undefined`;
    case 'union': {
      const options = schema.options ?? [];
      if (options.length === 0) {
        return giveUp(path, 'union', context, 'no options');
      }
      return options
        .map((option, index) =>
          emit(option, `${path} | [${index}]`, depth + 1, context)
        )
        .join(' | ');
    }
    default:
      // record / tuple / custom / lazy / intersect / variant など。
      // lazy の getter は呼ばない (循環と副作用を避けるため)
      return giveUp(path, schema.type, context);
  }
}

function emitObject(
  schema: SchemaLike,
  path: string,
  depth: number,
  context: Context
): string {
  const entries = Object.entries(schema.entries ?? {});
  if (entries.length === 0) return 'Record<string, never>';

  const members = entries.map(([key, entry]) => {
    const member = emitMember(entry, `${path}.${key}`, depth + 1, context);
    return `${quoteKey(key)}${member.optional ? '?' : ''}: ${member.text}`;
  });
  return `{ ${members.join('; ')} }`;
}

/**
 * オブジェクトのキー 1 つ分。
 * `optional` で既定値が無ければ `?:` にする (valibot の推論に合わせる)
 */
function emitMember(
  entry: unknown,
  path: string,
  depth: number,
  context: Context
): { text: string; optional: boolean } {
  if (isValibotSchema(entry)) {
    const schema = entry as SchemaLike;
    const wrapperless =
      schema.type === 'optional' || schema.type === 'exact_optional';
    if (wrapperless && findTransformation(schema) === undefined) {
      const text = emit(schema.wrapped, path, depth, context);
      // 既定値があれば検証後に必ず入るので、省略可能にはしない
      return { text, optional: schema.default === undefined };
    }
    if (schema.type === 'nullish' && findTransformation(schema) === undefined) {
      const text = emit(schema.wrapped, path, depth, context);
      return {
        text: `${text} | null`,
        optional: schema.default === undefined,
      };
    }
  }
  return { text: emit(entry, path, depth, context), optional: false };
}
