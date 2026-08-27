/**
 * argv は必ず文字列で届くので、宣言された型に合わせて値に直す。
 *
 * 検証 (valibot) の前に行う。ここで直せない場合は
 * 「--count には数値を渡してください」のように、何を渡すべきかを伝える。
 */
import type { TypeNode } from '../declaration/type-node.ts';

/** argv から取り出した生の値。`true` はフラグとして現れたことを表す */
export type RawValue = string | true;

export type CoerceResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

function coerceBoolean(raw: RawValue): CoerceResult {
  if (raw === true) return { ok: true, value: true };
  if (raw === 'true' || raw === '1') return { ok: true, value: true };
  if (raw === 'false' || raw === '0') return { ok: true, value: false };
  return {
    ok: false,
    message: `expected a boolean (true or false), received "${raw}"`,
  };
}

function coerceNumber(raw: RawValue): CoerceResult {
  if (raw === true) {
    return { ok: false, message: 'expected a number but no value was given' };
  }
  const value = Number(raw);
  if (raw.trim() === '' || Number.isNaN(value)) {
    return { ok: false, message: `expected a number, received "${raw}"` };
  }
  return { ok: true, value };
}

function coerceString(raw: RawValue): CoerceResult {
  if (raw === true) {
    return { ok: false, message: 'expected a value but none was given' };
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
      const asString = coerceString(raw);
      if (!asString.ok) return asString;
      const date = new Date(asString.value as string);
      if (Number.isNaN(date.getTime())) {
        return {
          ok: false,
          message: `expected a date, received "${String(raw)}"`,
        };
      }
      return { ok: true, value: date };
    }
    case 'object':
      // argv / env で Type.Object は宣言時に弾いている (§4.8)。
      // stdin (JSON) は変換を通さないので、ここには来ない
      return {
        ok: false,
        message: 'Type.Object cannot be used for argv or env',
      };
    case 'array':
      // 配列は「同じオプションの繰り返し」で表すので、ここには要素が来る
      return coerce(type.item, raw);
    case 'oneOf': {
      const messages: string[] = [];
      for (const option of type.options) {
        const result = coerce(option, raw);
        if (result.ok) return result;
        messages.push(result.message);
      }
      return { ok: false, message: messages.join(' / ') };
    }
    case 'custom':
      // as が primitive のときだけ変換する。それ以外は生文字列を渡す (§4.8)
      return type.coerceAs === 'none'
        ? coerceString(raw)
        : coerce({ kind: type.coerceAs } as TypeNode, raw);
  }
}

/**
 * 同じオプションが複数回現れた場合をまとめる。
 *
 * 配列型は繰り返しで集める。配列でない型の重複は**誤りとして報告する**
 * (最後勝ちにすると、意図しない上書きに気づけないため。§4.1)
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
    return {
      ok: false,
      message: `was given ${raws.length} times, but takes only one value`,
    };
  }

  const only = raws[0];
  if (only === undefined) {
    return { ok: false, message: 'expected a value but none was given' };
  }
  return coerce(type, only);
}
