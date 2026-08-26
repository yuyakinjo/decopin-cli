/**
 * 宣言から `.decopin/types.d.ts` を書く (§4.8 の emit)。
 *
 * `command.tsx` は `CommandProps<'hello'>` でこの型を引く。
 * JSX 式は型引数を運べない (ADR 9) ので、型はここを通してしか届かない。
 */
import type {
  ArgSpec,
  ArgvSpec,
  EnvSpec,
  OptionSpec,
  StdinSpec,
} from '../declaration/spec.ts';
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

/** stdin.tsx の宣言から、command が受け取る値の型を決める (§4.2) */
export function stdinTypeText(stdin: StdinSpec | undefined): string {
  if (stdin === undefined) return 'never';
  const base =
    stdin.mode === 'text'
      ? 'string'
      : stdin.mode === 'lines'
        ? 'string[]'
        : stdin.type === undefined
          ? 'unknown'
          : toTypeText(stdin.type);
  // required でなければ、端末実行時に undefined が渡る
  return stdin.required ? base : `${base} | undefined`;
}

function shape(spec: ArgvSpec, stdin: StdinSpec | undefined): string {
  const args =
    spec.args.length === 0
      ? '{}'
      : `{ ${spec.args.map(argMember).join('; ')} }`;
  const options =
    spec.options.length === 0
      ? '{}'
      : `{ ${spec.options.map(optionMember).join('; ')} }`;
  return `{ args: ${args}; options: ${options}; stdin: ${stdinTypeText(
    stdin
  )} }`;
}

/** `env.tsx` の宣言から Env の型を作る (§4.7) */
function envShape(env: EnvSpec | undefined): string {
  if (env === undefined || env.vars.length === 0) return '';
  const members = env.vars.map((declared) => {
    const always = declared.required || declared.defaultValue !== undefined;
    return `    ${quoteKey(declared.name)}${always ? '' : '?'}: ${toTypeText(
      declared.type
    )};`;
  });
  return `\n  interface EnvVars {\n${members.join('\n')}\n  }\n`;
}

export function generateTypes(
  evaluated: EvaluatedRoute[],
  env?: EnvSpec
): string {
  const entries = evaluated
    .map(
      ({ route, spec, stdin }) =>
        `    ${quoteName(route.name)}: ${shape(spec, stdin)};`
    )
    .join('\n');

  return `${HEADER}
import 'decopin-cli';

declare module 'decopin-cli' {
  interface Routes {
${entries}
  }
${envShape(env)}}
`;
}

/** ルートコマンドは空文字なので、常に引用符付きで書く */
function quoteName(name: string): string {
  return JSON.stringify(name);
}
