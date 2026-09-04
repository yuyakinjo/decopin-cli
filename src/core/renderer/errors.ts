import { ERROR_TAG, errorTag } from '../errors.ts';

/** レンダリング中の構造的な誤り。利用者のコードのバグを指す */
export class RenderError extends Error {
  override readonly name = 'RenderError';
  readonly [ERROR_TAG] = 'RenderError';
}

/** {@link RenderError} か。`instanceof` より広く当たる (ADR 42) */
export function isRenderError(value: unknown): value is RenderError {
  return errorTag(value) === 'RenderError';
}
