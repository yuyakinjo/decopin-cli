/**
 * 出自ではなく印で見分ける (ADR 42)。
 * `Symbol.for` はグローバルな登録簿から引くので、decopin-cli が
 * node_modules に 2 つ入っても、realm が違っても同じ印になる。
 */
const DECLARATION_ERROR = Symbol.for('decopin.DeclarationError');

/**
 * 宣言 (argv.tsx など) の書き方の誤り。
 * 利用者のコードのバグなので、直し方が分かる文にする。
 */
export class DeclarationError extends Error {
  override readonly name = 'DeclarationError';
  readonly [DECLARATION_ERROR] = true;
}

/** {@link DeclarationError} か。`instanceof` より広く当たる (ADR 42) */
export function isDeclarationError(value: unknown): value is DeclarationError {
  return (
    Error.isError(value) &&
    (value as { [DECLARATION_ERROR]?: unknown })[DECLARATION_ERROR] === true
  );
}
