import type { Renderable } from '../../jsx/types.ts';
/**
 * 型宣言コンポーネント `Type.*` (§5.1.2)。
 *
 * 利用者が valibot の書き方を覚えなくて済むように、型と制約を JSX で組む。
 * valibot への変換は `src/validation/` に閉じ込める (ADR 10)。
 */
import { host } from '../host.ts';

export interface StringTypeProps {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
}

export interface NumberTypeProps {
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface EnumTypeProps {
  values: readonly string[];
}

export interface DateTypeProps {
  min?: string;
  max?: string;
}

export interface ArrayTypeProps {
  minItems?: number;
  maxItems?: number;
  /** 要素の型を 1 つ */
  children: Renderable;
}

export interface ObjectTypeProps {
  /** `<Type.Field>` を並べる */
  children: Renderable;
}

export interface FieldTypeProps {
  name: string;
  required?: boolean;
  defaultValue?: unknown;
  /** 値の型を 1 つ */
  children: Renderable;
}

export interface OneOfTypeProps {
  /** 型を複数 (union) */
  children: Renderable;
}

export interface CustomTypeProps {
  validate: (value: unknown) => boolean;
  message?: string;
  /** argv の文字列をどう解釈するか (既定: string) */
  as?: 'string' | 'number' | 'boolean';
}

export const Type = {
  String: host<StringTypeProps>('type.string', 'Type.String'),
  Number: host<NumberTypeProps>('type.number', 'Type.Number'),
  Boolean: host<Record<never, never>>('type.boolean', 'Type.Boolean'),
  Enum: host<EnumTypeProps>('type.enum', 'Type.Enum'),
  Date: host<DateTypeProps>('type.date', 'Type.Date'),
  Array: host<ArrayTypeProps>('type.array', 'Type.Array'),
  Object: host<ObjectTypeProps>('type.object', 'Type.Object'),
  Field: host<FieldTypeProps>('type.field', 'Type.Field'),
  OneOf: host<OneOfTypeProps>('type.oneOf', 'Type.OneOf'),
  Custom: host<CustomTypeProps>('type.custom', 'Type.Custom'),
} as const;
