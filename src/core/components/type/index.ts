import type { Renderable } from '../../jsx/types.ts';
/**
 * 型宣言コンポーネント `Type.*`。
 *
 * 利用者が valibot の書き方を覚えなくて済むように、型と制約を JSX で組む。
 * valibot への変換は `src/core/validation/` に閉じ込める (ADR 10)。
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

/**
 * @deprecated 瞬間なのか暦日なのかが決まらない。`Type.Instant` か
 *   `Type.PlainDate` を使う。2027-08-29 以降に削除する
 */
export interface DateTypeProps {
  min?: string;
  max?: string;
}

/** 時間帯まで確定した一点。`2026-08-28T14:30:00Z` のようにオフセットが要る */
export interface InstantTypeProps {
  /** 下限。`Temporal.Instant` として読める文字列 */
  min?: string;
  /** 上限。`Temporal.Instant` として読める文字列 */
  max?: string;
}

/** 時刻を持たない暦日。`2026-08-28` */
export interface PlainDateTypeProps {
  /** 下限。`Temporal.PlainDate` として読める文字列 */
  min?: string;
  /** 上限。`Temporal.PlainDate` として読める文字列 */
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
  /**
   * 出力する TypeScript の型名。省略すると `unknown` になる。
   *
   * `'string'` / `'number'` / `'boolean'` のときだけ argv / env の文字列を
   * その型に変換する。それ以外 (`'URL'` など) は生文字列を `validate` に渡す (ADR 9)
   */
  as?: string;
}

/**
 * 型宣言コンポーネントの集まり。`Arg` / `Option` / `Var` / `Stdin` の
 * children として使う。覚えるのはこの 1 系統だけ
 */
export const Type = {
  String: host<StringTypeProps>('type.string', 'Type.String'),
  Number: host<NumberTypeProps>('type.number', 'Type.Number'),
  Boolean: host<Record<never, never>>('type.boolean', 'Type.Boolean'),
  Enum: host<EnumTypeProps>('type.enum', 'Type.Enum'),
  /**
   * @deprecated `Type.Instant` (瞬間) か `Type.PlainDate` (暦日) を使う。
   *   2027-08-29 以降に削除する
   */
  Date: host<DateTypeProps>('type.date', 'Type.Date'),
  Instant: host<InstantTypeProps>('type.instant', 'Type.Instant'),
  PlainDate: host<PlainDateTypeProps>('type.plainDate', 'Type.PlainDate'),
  Array: host<ArrayTypeProps>('type.array', 'Type.Array'),
  Object: host<ObjectTypeProps>('type.object', 'Type.Object'),
  Field: host<FieldTypeProps>('type.field', 'Type.Field'),
  OneOf: host<OneOfTypeProps>('type.oneOf', 'Type.OneOf'),
  Custom: host<CustomTypeProps>('type.custom', 'Type.Custom'),
} as const;
