/**
 * 出自ではなく印で見分ける (ADR 42)。
 *
 * `Symbol.for` はグローバルな登録簿から引くので、decopin-cli が
 * node_modules に 2 つ入っても、realm が違っても同じ印になる。
 * 印は 1 つのシンボルに種類の名前を載せる。`errorTag()` で読めば、
 * 種類ごとの判定も、まとめての分岐も同じ道具で書ける。
 */
export const ERROR_TAG = Symbol.for('decopin.error');

/**
 * 旧い印 (2026-09-04 以前)。種類ごとに別のシンボルだった。
 * 旧バージョンが投げたエラーを新バージョンが受け取る (逆も) 場面のために
 * 1 年は付け続け、見続ける (ADR 20)。`src/core/deprecations.ts` が期限を見張る
 */
export const LEGACY_ERROR_MARKS = {
  CliError: Symbol.for('decopin.CliError'),
  DeclarationError: Symbol.for('decopin.DeclarationError'),
} as const;

/**
 * 印を読む。印が無ければ undefined。
 *
 * 出自を問う判定は `Object.create(Error.prototype)` に騙され、
 * realm をまたぐと取り逃す。`Error.isError` は内部スロットを見る
 */
export function errorTag(value: unknown): string | undefined {
  if (!Error.isError(value)) return undefined;
  const tag = (value as { [ERROR_TAG]?: unknown })[ERROR_TAG];
  if (typeof tag === 'string') return tag;
  // 旧い印しか持たない相手 (旧バージョンが投げたもの)
  const marked = value as unknown as { [key: symbol]: unknown };
  for (const [name, mark] of Object.entries(LEGACY_ERROR_MARKS)) {
    if (marked[mark] === true) return name;
  }
  return undefined;
}

/**
 * 宣言 (argv.tsx など) の書き方の誤り。
 * 利用者のコードのバグなので、直し方が分かる文にする。
 */
export class DeclarationError extends Error {
  override readonly name = 'DeclarationError';
  readonly [ERROR_TAG] = 'DeclarationError';
  /** 旧バージョンの受け手のため (2027-09-04 まで) */
  readonly [LEGACY_ERROR_MARKS.DeclarationError] = true;
}

/** {@link DeclarationError} か。`instanceof` より広く当たる (ADR 42) */
export function isDeclarationError(value: unknown): value is DeclarationError {
  return errorTag(value) === 'DeclarationError';
}
