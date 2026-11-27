/**
 * argv は必ず文字列で届くので、宣言された型に合わせて値に直す。
 *
 * 検証 (valibot) の前に行う。ここで直せない場合は
 * 「--count には数値を渡してください」のように、何を渡すべきかを伝える。
 */
import type { TypeNode } from '../types/type-node.ts';

/** argv から取り出した生の値。`true` はフラグとして現れたことを表す */
export type RawValue = string | true;

/**
 * 失敗には 2 つの文面を持たせる。`message` は受け取った値を添えたもの
 * (打った本人に見せる argv 用)。`expectation` は**値を含まない**もので、
 * 値が秘密でありうる経路 (環境変数) はこちらだけを出す
 */
export type CoerceResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string; expectation: string };

/** 「何を期待したか」に、受け取った値を添えた失敗 */
function mismatch(expectation: string, raw: RawValue): CoerceResult {
  return {
    ok: false,
    message: `${expectation}, received "${String(raw)}"`,
    expectation,
  };
}

/** 値を引用しない失敗。2 つの文面は同じになる */
function failure(message: string): CoerceResult {
  return { ok: false, message, expectation: message };
}

function coerceBoolean(raw: RawValue): CoerceResult {
  if (raw === true) return { ok: true, value: true };
  if (raw === 'true' || raw === '1') return { ok: true, value: true };
  if (raw === 'false' || raw === '0') return { ok: true, value: false };
  return mismatch('expected a boolean (true or false)', raw);
}

function coerceNumber(raw: RawValue): CoerceResult {
  if (raw === true) {
    return failure('expected a number but no value was given');
  }
  const value = Number(raw);
  if (raw.trim() === '' || Number.isNaN(value)) {
    return mismatch('expected a number', raw);
  }
  return { ok: true, value };
}

function coerceString(raw: RawValue): CoerceResult {
  if (raw === true) {
    return failure('expected a value but none was given');
  }
  return { ok: true, value: raw };
}

/** 1 つの生の値を宣言された型に直す */
export function coerce(type: TypeNode, raw: RawValue): CoerceResult {
  switch (type.kind) {
    case 'boolean':
      return coerceBoolean(raw);
    case 'number':
      return coerceNumber(raw);
    case 'string':
    case 'enum':
      return coerceString(raw);
    case 'date': {
      // 非推奨。Date は読めない文字列でも Invalid Date を返して先に進むので
      // ここで弾く必要がある (Temporal は例外を投げるので不要)
      const asString = coerceString(raw);
      if (!asString.ok) return asString;
      const date = new Date(asString.value as string);
      if (Number.isNaN(date.getTime())) {
        return mismatch('expected a date', raw);
      }
      return { ok: true, value: date };
    }
    case 'instant':
      // Temporal は読めない文字列で例外を投げる。Date の Invalid Date と違い
      // 「読めたつもりの値」が先に進まない
      return fromTemporal(raw, 'an instant like 2026-08-28T14:30:00Z', (text) =>
        Temporal.Instant.from(text)
      );
    case 'plainDate':
      return fromTemporal(raw, 'a date like 2026-08-28', (text) =>
        Temporal.PlainDate.from(text)
      );
    case 'object':
      // argv / env で Type.Object は宣言時に弾いている (ADR 9)。
      // stdin (JSON) は変換を通さないので、ここには来ない
      return failure('Type.Object cannot be used for argv or env');
    case 'array':
      // 配列は「同じオプションの繰り返し」で表すので、ここには要素が来る
      return coerce(type.item, raw);
    case 'oneOf': {
      const messages: string[] = [];
      const expectations: string[] = [];
      for (const option of type.options) {
        const result = coerce(option, raw);
        if (result.ok) return result;
        messages.push(result.message);
        expectations.push(result.expectation);
      }
      return {
        ok: false,
        message: messages.join(' / '),
        expectation: expectations.join(' / '),
      };
    }
    case 'custom':
      // as が primitive のときだけ変換する。それ以外は生文字列を渡す (ADR 9)
      return type.coerceAs === 'none'
        ? coerceString(raw)
        : coerce({ kind: type.coerceAs } as TypeNode, raw);
  }
}

/**
 * 同じオプションが複数回現れた場合をまとめる。
 *
 * 配列型は繰り返しで集める。配列でない型の重複は**誤りとして報告する**
 * (最後勝ちにすると、意図しない上書きに気づけないため。test/contract/argv-parsing.test.ts)
 */
export function coerceAll(type: TypeNode, raws: RawValue[]): CoerceResult {
  if (type.kind === 'array') {
    const values: unknown[] = [];
    for (const raw of raws) {
      const result = coerce(type.item, raw);
      if (!result.ok) return result;
      values.push(result.value);
    }
    return { ok: true, value: values };
  }

  if (raws.length > 1) {
    return failure(`was given ${raws.length} times, but takes only one value`);
  }

  const only = raws[0];
  if (only === undefined) {
    return failure('expected a value but none was given');
  }
  return coerce(type, only);
}

/** 文字列を Temporal の値にする。読めなければ何を期待したかを言う */
function fromTemporal(
  raw: RawValue,
  expected: string,
  parse: (text: string) => unknown
): CoerceResult {
  const asString = coerceString(raw);
  if (!asString.ok) return asString;
  try {
    return { ok: true, value: parse(asString.value as string) };
  } catch {
    return mismatch(`expected ${expected}`, raw);
  }
}
