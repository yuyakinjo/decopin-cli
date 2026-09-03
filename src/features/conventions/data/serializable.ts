/**
 * `data.tsx` の値を `--json` に出す前に、JSON で往復できるかを見る (ADR 27)。
 *
 * `JSON.stringify` は黙って壊す: 関数と `undefined` は消え、`Map` / `Set` は
 * `{}` になり、`NaN` / `Infinity` は `null` になる。`bigint` だけは投げる。
 * どれも「出してみたら欠けていた」で気づく類なので、出す前に止めて
 * **どの経路が悪いか**を言う。
 *
 * 型検査には頼らない。生成した `.d.ts` に検査を埋めても
 * `skipLibCheck: true` で消える (よくある設定。実測で確認)。
 */

/** 見つかった問題。`path` は `data.items[0].when` の形 */
export interface NotSerializable {
  path: string;
  /** 何がいけないか (英語。利用者に出る) */
  reason: string;
}

/** プロトタイプが素の object か null なら「ただのデータ」とみなす */
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === null || proto === Object.prototype;
}

/** クラス名が分かれば出す (Date / Map / Temporal.Instant など) */
function nameOf(value: object): string {
  const proto = Object.getPrototypeOf(value) as {
    constructor?: unknown;
  } | null;
  const ctor = proto?.constructor;
  const name =
    typeof ctor === 'function' ? (ctor as { name?: unknown }).name : undefined;
  return typeof name === 'string' && name !== '' ? name : 'object';
}

/**
 * 最初に見つかった問題を返す。無ければ undefined。
 *
 * 1 件で止めるのは、直す順番が上から下に決まっているため
 * (先頭を直すと後ろが変わることが多い)
 */
export function findNotSerializable(
  value: unknown,
  path = 'data',
  seen = new WeakSet<object>()
): NotSerializable | undefined {
  if (value === null) return undefined;

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return undefined;
    case 'number':
      // JSON に無限大や NaN は書けない。null に化けるので止める
      return Number.isFinite(value)
        ? undefined
        : { path, reason: `${String(value)} becomes null in JSON` };
    case 'bigint':
      return { path, reason: 'bigint cannot be serialized' };
    case 'function':
      return { path, reason: 'a function disappears in JSON' };
    case 'symbol':
      return { path, reason: 'a symbol disappears in JSON' };
    case 'undefined':
      // オブジェクトの値としては落ちるだけだが、そこだけは呼び出し側が許す
      return { path, reason: 'undefined disappears in JSON' };
    default:
      break;
  }

  const object = value as object;
  // 循環は JSON.stringify が投げる。先に見つけて経路を出す
  if (seen.has(object)) {
    return { path, reason: 'circular reference' };
  }
  seen.add(object);

  if (Array.isArray(object)) {
    for (const [index, item] of object.entries()) {
      // 配列の穴と undefined は null になる。黙って変わるので止める
      const found = findNotSerializable(item, `${path}[${index}]`, seen);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (!isPlainObject(object)) {
    const name = nameOf(object);
    const hint =
      typeof (object as { toJSON?: unknown }).toJSON === 'function'
        ? `${name} serializes to a string that its type does not mention`
        : `${name} becomes {} in JSON`;
    return { path, reason: hint };
  }

  for (const [key, item] of Object.entries(object)) {
    // オブジェクトの undefined はキーごと落ちる。宣言と食い違うので止める
    const child = `${path}.${key}`;
    const found = findNotSerializable(item, child, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}
