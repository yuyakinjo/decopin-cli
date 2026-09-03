/**
 * `TypeNode` を JSON Schema にする (ADR 33)。
 *
 * valibot (`toSchema`)、TS の型テキスト (`toTypeText`)、help の表示
 * (`typeLabel`) と同じ木から導く。MCP の `inputSchema` / `outputSchema` が
 * 読む相手で、argv.tsx / output.tsx の宣言がそのまま外に出る。
 *
 * 制約は宣言にあるものだけ写す。書いていない制約を足すと、実行時の検証
 * (valibot) と食い違って「スキーマは通るのに実行で落ちる」形になる。
 */
import type { TypeNode } from './type-node.ts';

/** JSON Schema (draft 2020-12 の範囲で使う部分だけ) */
export type JsonSchema = {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  enum?: string[];
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  anyOf?: JsonSchema[];
};

/** `undefined` の項目を落として、スキーマを見た目どおりの JSON にする */
export function compactJsonSchema<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T;
}

/** 型の木を JSON Schema にする。制約は宣言にあるものだけ写す */
export function toJsonSchema(type: TypeNode): JsonSchema {
  switch (type.kind) {
    case 'string':
      return compactJsonSchema({
        type: 'string',
        minLength: type.minLength,
        maxLength: type.maxLength,
        pattern: type.pattern,
        // email と url が両方立つことはない (宣言側が 1 つに絞る)
        format: type.email ? 'email' : type.url ? 'uri' : undefined,
      });
    case 'number':
      return compactJsonSchema({
        type: type.integer ? 'integer' : 'number',
        minimum: type.min,
        maximum: type.max,
      });
    case 'boolean':
      return { type: 'boolean' };
    case 'enum':
      return { type: 'string', enum: [...type.values] };
    case 'date':
    case 'instant':
      // 実行時は文字列で受けて Temporal / Date に直す。外から見れば ISO 8601
      return { type: 'string', format: 'date-time' };
    case 'plainDate':
      return { type: 'string', format: 'date' };
    case 'array':
      return compactJsonSchema({
        type: 'array',
        items: toJsonSchema(type.item),
        minItems: type.minItems,
        maxItems: type.maxItems,
      });
    case 'object': {
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const field of type.fields) {
        properties[field.name] = compactJsonSchema({
          ...toJsonSchema(field.type),
          default: field.defaultValue,
        });
        if (field.required) required.push(field.name);
      }
      return compactJsonSchema({
        type: 'object',
        properties,
        required: required.length === 0 ? undefined : required,
      });
    }
    case 'oneOf':
      return { anyOf: type.options.map(toJsonSchema) };
    case 'custom':
      // validate 関数の中身は読めない。`as` が primitive ならその型、
      // それ以外は何でも通す (実行時の検証が本当の門番)
      return compactJsonSchema({
        type:
          type.as === 'string' || type.as === 'number' || type.as === 'boolean'
            ? type.as
            : undefined,
        description: type.message,
      });
  }
}
