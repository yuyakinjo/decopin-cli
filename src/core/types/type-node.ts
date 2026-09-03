/**
 * `Type.*` を評価した結果。
 * valibot への変換 (ADR 9 の対応表) と help の表示は、すべてこの木から導く。
 */

export interface StringType {
  kind: 'string';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
}

export interface NumberType {
  kind: 'number';
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface BooleanType {
  kind: 'boolean';
}

export interface EnumType {
  kind: 'enum';
  values: string[];
}

/**
 * @deprecated `InstantType` か `PlainDateType` を使う。2027-08-29 以降に削除する
 */
export interface DateType {
  kind: 'date';
  min?: string;
  max?: string;
}

/** 時間帯まで確定した一点 (`Temporal.Instant`) */
export interface InstantType {
  kind: 'instant';
  min?: string;
  max?: string;
}

/** 時刻を持たない暦日 (`Temporal.PlainDate`) */
export interface PlainDateType {
  kind: 'plainDate';
  min?: string;
  max?: string;
}

export interface ArrayType {
  kind: 'array';
  item: TypeNode;
  minItems?: number;
  maxItems?: number;
}

export interface ObjectField {
  name: string;
  required: boolean;
  defaultValue?: unknown;
  type: TypeNode;
}

export interface ObjectType {
  kind: 'object';
  fields: ObjectField[];
}

export interface OneOfType {
  kind: 'oneOf';
  options: TypeNode[];
}

export interface CustomType {
  kind: 'custom';
  validate: (value: unknown) => boolean;
  message?: string;
  /**
   * 出力する TypeScript の型名 (`'number'`, `'URL'` など)。
   * 省略時は `unknown` (ADR 9)
   */
  as?: string;
  /**
   * argv / env の文字列をどう変換するか。
   * `as` が primitive のときだけ変換し、それ以外は生文字列を渡す
   */
  coerceAs: 'string' | 'number' | 'boolean' | 'none';
}

/** 型宣言の木。valibot への変換と型テキストの生成はここから導く */
export type TypeNode =
  | StringType
  | NumberType
  | BooleanType
  | EnumType
  | DateType
  | InstantType
  | PlainDateType
  | ArrayType
  | ObjectType
  | OneOfType
  | CustomType;

/** help の表示に使う型の名前 */
export function typeLabel(type: TypeNode): string {
  switch (type.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return type.values.join('|');
    case 'date':
      return 'date';
    case 'instant':
      return 'instant';
    case 'plainDate':
      return 'date';
    case 'array':
      return `${typeLabel(type.item)}...`;
    case 'object':
      return 'object';
    case 'oneOf':
      return type.options.map(typeLabel).join('|');
    case 'custom':
      return type.as ?? 'value';
  }
}
