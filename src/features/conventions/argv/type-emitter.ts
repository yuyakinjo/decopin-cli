import {
  quoteKey,
  toTypeText,
  wrapUnion,
} from '../../../declaration/type-text.ts';
import type { ArgSpec, ArgvSpec, OptionSpec } from './spec.ts';

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
  const text = toTypeText(arg.type);
  const type = arg.variadic ? `${wrapUnion(text)}[]` : text;
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

/** argv.tsx の宣言から、生成する args / options の型テキストを組み立てる */
export function argvTypeText(spec: ArgvSpec): string {
  const args =
    spec.args.length === 0
      ? '{}'
      : `{ ${spec.args.map(argMember).join('; ')} }`;
  const options =
    spec.options.length === 0
      ? '{}'
      : `{ ${spec.options.map(optionMember).join('; ')} }`;
  return `args: ${args}; options: ${options}`;
}
