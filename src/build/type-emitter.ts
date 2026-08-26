/**
 * 宣言から `.decopin/types.d.ts` を書く (§4.8 の emit)。
 *
 * `command.tsx` は `CommandProps<'hello'>` でこの型を引く。
 * JSX 式は型引数を運べない (ADR 9) ので、型はここを通してしか届かない。
 */
import type { ArgSpec, ArgvSpec, OptionSpec } from '../declaration/spec.ts';
import type { TypeNode } from '../declaration/type-node.ts';
import type { EvaluatedRoute } from './evaluator.ts';

const HEADER = `// このファイルは decopin build / decopin dev が生成します。
// 直接編集しても次のビルドで上書きされます。
`;

/** 型宣言を TypeScript の型に直す */
export function toTypeText(type: TypeNode): string {
  switch (type.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return type.values.map((value) => JSON.stringify(value)).join(' | ');
    case 'date':
      return 'Date';
    case 'array':
      return `${wrap(type.item)}[]`;
    case 'object': {
      const fields = type.fields.map((field) => {
        const optional = field.required || field.defaultValue !== undefined;
        return `${quoteKey(field.name)}${optional ? '' : '?'}: ${toTypeText(
          field.type
        )}`;
      });
      return `{ ${fields.join('; ')} }`;
    }
    case 'oneOf':
      return type.options.map(wrap).join(' | ');
    case 'custom':
      return type.as;
  }
}

/** union を配列にするときは括弧が必要 */
function wrap(type: TypeNode): string {
  const text = toTypeText(type);
  return text.includes(' | ') ? `(${text})` : text;
}

/** 識別子として使えない名前は引用符で囲む */
function quoteKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/** 省略できるキーは `?` を付ける (既定値があれば必ず入るので付けない) */
function member(
  name: string,
  type: string,
  required: boolean,
  defaultValue: unknown
): string {
  const always = required || defaultValue !== undefined;
  return `${quoteKey(name)}${always ? '' : '?'}: ${type}`;
}

function argMember(arg: ArgSpec): string {
  const type = arg.variadic ? `${wrap(arg.type)}[]` : toTypeText(arg.type);
  return member(arg.name, type, arg.required, arg.defaultValue);
}

function optionMember(option: OptionSpec): string {
  return member(
    option.name,
    toTypeText(option.type),
    option.required,
    option.defaultValue
  );
}

function shape(spec: ArgvSpec): string {
  const args =
    spec.args.length === 0
      ? '{}'
      : `{ ${spec.args.map(argMember).join('; ')} }`;
  const options =
    spec.options.length === 0
      ? '{}'
      : `{ ${spec.options.map(optionMember).join('; ')} }`;
  // stdin は Phase 6 で埋まる
  return `{ args: ${args}; options: ${options}; stdin: never }`;
}

export function generateTypes(evaluated: EvaluatedRoute[]): string {
  const entries = evaluated
    .map(({ route, spec }) => `    ${quoteName(route.name)}: ${shape(spec)};`)
    .join('\n');

  return `${HEADER}
import 'decopin-cli';

declare module 'decopin-cli' {
  interface Routes {
${entries}
  }
}
`;
}

/** ルートコマンドは空文字なので、常に引用符付きで書く */
function quoteName(name: string): string {
  return JSON.stringify(name);
}
