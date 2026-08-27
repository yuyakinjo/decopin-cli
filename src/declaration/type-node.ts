/**
 * `Type.*` を評価した結果 (§5.1.2)。
 * valibot への変換 (§4.8 の対応表) と help の表示は、すべてこの木から導く。
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

export interface DateType {
  kind: 'date';
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
   * 省略時は `unknown` (§4.8)
   */
  as?: string;
  /**
   * argv / env の文字列をどう変換するか。
   * `as` が primitive のときだけ変換し、それ以外は生文字列を渡す
   */
  coerceAs: 'string' | 'number' | 'boolean' | 'none';
}

export type TypeNode =
  | StringType
  | NumberType
  | BooleanType
  | EnumType
  | DateType
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
