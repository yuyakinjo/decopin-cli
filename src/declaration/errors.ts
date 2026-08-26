/**
 * 宣言 (argv.tsx など) の書き方の誤り。
 * 利用者のコードのバグなので、直し方が分かる文にする。
 */
export class DeclarationError extends Error {
  override readonly name = 'DeclarationError';
}
