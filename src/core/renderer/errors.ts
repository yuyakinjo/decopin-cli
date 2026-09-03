/** レンダリング中の構造的な誤り。利用者のコードのバグを指す */
export class RenderError extends Error {
  override readonly name = 'RenderError';
}
