import {
  compactJsonSchema,
  toJsonSchema,
} from '../../../core/types/json-schema.ts';
import type { JsonSchema } from '../../../core/types/json-schema.ts';
import type { StdinSpec } from '../stdin/spec.ts';
import type { ArgvSpec } from './spec.ts';

/** MCP のツールが stdin を受け取るときの引数名 */
export const STDIN_ARGUMENT = 'stdin';

/**
 * argv.tsx の宣言を、ツール呼び出しの引数の形にする。
 *
 * 位置引数もオプションも 1 つのオブジェクトの項目になる。呼ぶ側は
 * 「何番目か」を知らなくてよいので、名前で渡せる形が向いている。
 * `hidden` のオプションは help と同じく外に出さない。
 * stdin.tsx があれば、パイプで渡すはずの中身を {@link STDIN_ARGUMENT} で受ける
 */
export function argumentsSchema(spec: ArgvSpec, stdin?: StdinSpec): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const arg of spec.args) {
    const item = toJsonSchema(arg.type);
    properties[arg.name] = compactJsonSchema({
      ...(arg.variadic ? { type: 'array' as const, items: item } : item),
      description: arg.description,
      default: arg.defaultValue,
    });
    if (arg.required) required.push(arg.name);
  }

  for (const option of spec.options) {
    if (option.hidden) continue;
    properties[option.name] = compactJsonSchema({
      ...toJsonSchema(option.type),
      description: option.description,
      default: option.defaultValue,
    });
    if (option.required) required.push(option.name);
  }

  if (stdin !== undefined && !(STDIN_ARGUMENT in properties)) {
    properties[STDIN_ARGUMENT] =
      stdin.mode === 'json' && stdin.type !== undefined
        ? compactJsonSchema({
            ...toJsonSchema(stdin.type),
            description: 'What would be piped to standard input',
          })
        : {
            type: 'string',
            description:
              stdin.mode === 'lines'
                ? 'What would be piped to standard input, one item per line'
                : 'What would be piped to standard input',
          };
    if (stdin.required) required.push(STDIN_ARGUMENT);
  }

  return compactJsonSchema({
    type: 'object',
    properties,
    required: required.length === 0 ? undefined : required,
    // 宣言に無い引数を機械が発明しても、実行時に Unknown option で落ちる。
    // スキーマの段階で断っておく
    additionalProperties: false,
  });
}
