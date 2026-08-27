/**
 * {@link TypeNode} → valibot スキーマ (ADR 9 の対応表)。
 *
 * valibot への依存はこのディレクトリに閉じ込める (ADR 10)。
 * 利用者のコードには valibot は出てこない。
 */
import * as v from 'valibot';

import type { TypeNode } from '../declaration/type-node.ts';

type Schema = v.GenericSchema;

/** valibot のスキーマ。生スキーマを受け取る経路のために公開する */
export type GenericSchema = v.GenericSchema;

function stringSchema(type: Extract<TypeNode, { kind: 'string' }>): Schema {
  const checks: v.GenericPipeAction<string, string, v.BaseIssue<unknown>>[] =
    [];
  if (type.minLength !== undefined) checks.push(v.minLength(type.minLength));
  if (type.maxLength !== undefined) checks.push(v.maxLength(type.maxLength));
  if (type.pattern !== undefined) {
    checks.push(v.regex(new RegExp(type.pattern)));
  }
  if (type.email === true) checks.push(v.email());
  if (type.url === true) checks.push(v.url());
  return checks.length === 0
    ? v.string()
    : (v.pipe(
        v.string(),
        ...(checks as [
          v.GenericPipeAction<string, string, v.BaseIssue<unknown>>,
        ])
      ) as Schema);
}

function numberSchema(type: Extract<TypeNode, { kind: 'number' }>): Schema {
  const checks: v.GenericPipeAction<number, number, v.BaseIssue<unknown>>[] =
    [];
  if (type.integer === true) checks.push(v.integer());
  if (type.min !== undefined) checks.push(v.minValue(type.min));
  if (type.max !== undefined) checks.push(v.maxValue(type.max));
  return checks.length === 0
    ? v.number()
    : (v.pipe(
        v.number(),
        ...(checks as [
          v.GenericPipeAction<number, number, v.BaseIssue<unknown>>,
        ])
      ) as Schema);
}

/** 型宣言をスキーマにする */
export function toSchema(type: TypeNode): Schema {
  switch (type.kind) {
    case 'string':
      return stringSchema(type);
    case 'number':
      return numberSchema(type);
    case 'boolean':
      return v.boolean();
    case 'enum':
      return v.picklist(type.values) as Schema;
    case 'date': {
      const checks: v.GenericPipeAction<Date, Date, v.BaseIssue<unknown>>[] =
        [];
      if (type.min !== undefined) {
        checks.push(v.minValue(new Date(type.min)));
      }
      if (type.max !== undefined) {
        checks.push(v.maxValue(new Date(type.max)));
      }
      return checks.length === 0
        ? v.date()
        : (v.pipe(
            v.date(),
            ...(checks as [
              v.GenericPipeAction<Date, Date, v.BaseIssue<unknown>>,
            ])
          ) as Schema);
    }
    case 'array': {
      const item = toSchema(type.item);
      const checks: v.GenericPipeAction<
        unknown[],
        unknown[],
        v.BaseIssue<unknown>
      >[] = [];
      if (type.minItems !== undefined) checks.push(v.minLength(type.minItems));
      if (type.maxItems !== undefined) checks.push(v.maxLength(type.maxItems));
      const array = v.array(item);
      return checks.length === 0
        ? (array as Schema)
        : (v.pipe(
            array,
            ...(checks as [
              v.GenericPipeAction<unknown[], unknown[], v.BaseIssue<unknown>>,
            ])
          ) as Schema);
    }
    case 'object': {
      const entries: Record<string, Schema> = {};
      for (const field of type.fields) {
        const schema = toSchema(field.type);
        entries[field.name] = field.required
          ? schema
          : (withDefault(schema, field.defaultValue) as Schema);
      }
      return v.object(entries) as Schema;
    }
    case 'oneOf':
      return v.union(type.options.map(toSchema)) as Schema;
    case 'custom': {
      // 変換しない場合は何が来るか分からないので unknown を基底にする
      const base =
        type.coerceAs === 'number'
          ? v.number()
          : type.coerceAs === 'boolean'
            ? v.boolean()
            : type.coerceAs === 'string'
              ? v.string()
              : v.unknown();
      return v.pipe(
        base as v.GenericSchema,
        v.check(
          (value: unknown) => type.validate(value),
          type.message ?? 'Invalid value'
        )
      ) as Schema;
    }
  }
}

/** 省略可能にする。既定値があれば付ける */
export function withDefault(schema: Schema, defaultValue: unknown): Schema {
  return defaultValue === undefined
    ? (v.optional(schema) as Schema)
    : (v.optional(schema, defaultValue as never) as Schema);
}

/** 検証を実行し、失敗したら人が読めるメッセージの配列を返す */
export function validateValue(
  schema: Schema,
  value: unknown
): { ok: true; value: unknown } | { ok: false; messages: string[] } {
  const result = v.safeParse(schema, value);
  if (result.success) return { ok: true, value: result.output };
  return {
    ok: false,
    messages: result.issues.map((issue) => issue.message),
  };
}
