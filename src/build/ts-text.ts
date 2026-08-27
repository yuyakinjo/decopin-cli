/**
 * TypeScript の型テキストを組み立てる小道具。
 * type-emitter と schema-introspect の両方が使う (循環 import を避けるため分離)。
 */

/** 識別子として使えない名前は引用符で囲む */
export function quoteKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/** union を配列にするときは括弧が必要 */
export function wrapUnion(text: string): string {
  return text.includes(' | ') ? `(${text})` : text;
}
