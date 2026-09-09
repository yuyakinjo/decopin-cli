/**
 * valibot スキーマを歩いて、TypeScript の型テキスト (ADR 9) と JSON Schema
 * (ADR 33) を作る。
 *
 * `<Stdin mode="json" schema={...}>` のエスケープハッチのためだけに使う。
 * JSX は型を運べない (ADR 9) ので、渡された**実オブジェクト**を読む。
 *
 * valibot を import しないのは意図的で、`type` 文字列で分岐するだけで足りる。
 * これにより valibot への依存は src/core/validation/ に閉じたままになる (ADR 10)。
 */
import { compactJsonSchema, type JsonSchema } from '../types/json-schema.ts';
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

/**
 * valibot スキーマを JSON Schema にする (ADR 33)。
 *
 * `Type.*` で組んだ宣言は {@link toJsonSchema} が変換するが、`output.tsx` /
 * `stdin.tsx` は valibot スキーマを直接渡せる (ADR 9 の逃げ道)。そちらで
 * 書いても MCP のスキーマが消えないように、同じ木をここでも歩く。
 *
 * **表せない節は `{}` にする**。JSON Schema の `{}` は「制約なし」であって
 * 嘘ではないので、ここだけは annotations (ADR 32 の `unknown` は黙る) と
 * 逆に倒す。制約を強める側に間違えると、通るはずの値を弾く形になるため、
 * 読めた制約だけを写して残りは開けておく。
 *
 * direction は既定で output。stdin は input を指定し、既定値を持つキーも
 * 省略可能として公開する。
 *
 * @returns valibot スキーマでなければ undefined (スキーマを出さない)
 */
export function schemaToJsonSchema(
  schema: unknown,
  options: { maxDepth?: number; direction?: 'input' | 'output' } = {}
): JsonSchema | undefined {
  if (!isValibotSchema(schema) || isAsyncSchema(schema)) return undefined;
  return jsonSchemaOf(
    schema,
    options.maxDepth ?? DEFAULT_MAX_DEPTH,
    new Set(),
    options.direction === 'input'
  );
}

/** 制約なし。表せなかった節はこれになる */
const ANY: JsonSchema = {};

/** valibot の validation アクション 1 つ */
interface Action {
  type: string;
  requirement?: unknown;
}

/**
 * `pipe` の validation アクションを集める。
 *
 * 入れ子の pipe は平坦化されないので {@link findTransformation} と同じく
 * `pipe[0]` を再帰的に辿る。metadata と transformation は制約ではないので落とす
 */
function actionsOf(schema: SchemaLike): Action[] {
  const pipe = schema.pipe;
  if (!Array.isArray(pipe) || pipe.length === 0) return [];

  const [base, ...rest] = pipe;
  const inherited =
    base !== undefined && base !== schema && isValibotSchema(base)
      ? actionsOf(base as SchemaLike)
      : [];

  const actions: Action[] = [...inherited];
  for (const action of rest) {
    if (typeof action !== 'object' || action === null) continue;
    const { kind, type, requirement } = action as {
      kind?: unknown;
      type?: unknown;
      requirement?: unknown;
    };
    if (kind !== 'validation' || typeof type !== 'string') continue;
    actions.push({ type, requirement });
  }
  return actions;
}

/** 数値の制約だけを取る (`requirement` が数でないものは無視する) */
function numeric(actions: Action[], type: string): number | undefined {
  for (const action of actions) {
    if (action.type === type && typeof action.requirement === 'number') {
      return action.requirement;
    }
  }
  return undefined;
}

function has(actions: Action[], type: string): boolean {
  return actions.some((action) => action.type === type);
}

/** 文字数・要素数の下限と上限。`length` は両方を決める */
function bounds(actions: Action[]): { min?: number; max?: number } {
  const exact = numeric(actions, 'length');
  return exact === undefined
    ? {
        min: numeric(actions, 'min_length'),
        max: numeric(actions, 'max_length'),
      }
    : { min: exact, max: exact };
}

/** リテラルの並びを enum にする。文字列だけなら出せる */
function enumOf(values: readonly unknown[]): JsonSchema {
  return values.length > 0 && values.every((value) => typeof value === 'string')
    ? { type: 'string', enum: [...(values as string[])] }
    : ANY;
}

function jsonSchemaOf(
  value: unknown,
  depth: number,
  stack: Set<object>,
  input: boolean
): JsonSchema {
  if (depth < 0 || !isValibotSchema(value)) return ANY;

  const schema = value as SchemaLike;
  const object = value as object;
  // 循環と、値を変えるアクション (transform の先は読めない) はここで開ける
  if (stack.has(object)) return ANY;
  if (schema.async === true) return ANY;
  if (findTransformation(schema) !== undefined) return ANY;

  stack.add(object);
  try {
    return byType(schema, depth, stack, input);
  } finally {
    stack.delete(object);
  }
}

function byType(
  schema: SchemaLike,
  depth: number,
  stack: Set<object>,
  input: boolean
): JsonSchema {
  const actions = actionsOf(schema);
  switch (schema.type) {
    case 'string': {
      const { min, max } = bounds(actions);
      const pattern = actions.find(
        (action) => action.type === 'regex'
      )?.requirement;
      return compactJsonSchema({
        type: 'string',
        minLength: min,
        maxLength: max,
        pattern:
          pattern instanceof RegExp && pattern.flags === ''
            ? pattern.source
            : undefined,
        // email と url が両方立つことは実際には無い。立てば先に書いた方を採る
        format: has(actions, 'email')
          ? 'email'
          : has(actions, 'url')
            ? 'uri'
            : undefined,
      });
    }
    case 'number':
      return compactJsonSchema({
        type: has(actions, 'integer') ? 'integer' : 'number',
        minimum: numeric(actions, 'min_value'),
        maximum: numeric(actions, 'max_value'),
      });
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      // 実行時は Date だが、JSON になった時点では ISO 8601 の文字列
      return { type: 'string', format: 'date-time' };
    case 'literal':
      return enumOf([schema.literal]);
    case 'picklist':
    case 'enum':
      return enumOf(schema.options ?? []);
    case 'array': {
      const { min, max } = bounds(actions);
      return compactJsonSchema({
        type: 'array',
        items: jsonSchemaOf(schema.item, depth - 1, stack, input),
        minItems: min,
        maxItems: max,
      });
    }
    case 'object':
    case 'loose_object':
      return objectSchema(schema, depth, stack, input);
    case 'optional':
    case 'exact_optional':
      return jsonSchemaOf(schema.wrapped, depth - 1, stack, input);
    case 'null':
      return { type: 'null' };
    case 'nullable':
    case 'nullish':
      return {
        anyOf: [
          jsonSchemaOf(schema.wrapped, depth - 1, stack, input),
          { type: 'null' },
        ],
      };
    case 'union': {
      const options = schema.options ?? [];
      if (options.length === 0) return ANY;
      return {
        anyOf: options.map((option) =>
          jsonSchemaOf(option, depth - 1, stack, input)
        ),
      };
    }
    default:
      // record / tuple / custom / lazy / intersect / variant など。
      // lazy の getter は呼ばない (循環と副作用を避けるため)
      return ANY;
  }
}

/** 省略してよいキー。既定値があれば検証後に必ず入るので required に数える */
function isOptionalEntry(entry: unknown, input: boolean): boolean {
  if (!isValibotSchema(entry)) return false;
  const schema = entry as SchemaLike;
  const wrapper =
    schema.type === 'optional' ||
    schema.type === 'exact_optional' ||
    schema.type === 'nullish';
  return wrapper && (input || schema.default === undefined);
}

function objectSchema(
  schema: SchemaLike,
  depth: number,
  stack: Set<object>,
  input: boolean
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const [key, entry] of Object.entries(schema.entries ?? {})) {
    properties[key] = jsonSchemaOf(entry, depth - 1, stack, input);
    if (!isOptionalEntry(entry, input)) required.push(key);
  }
  return compactJsonSchema({
    type: 'object',
    properties,
    required: required.length === 0 ? undefined : required,
  });
}
