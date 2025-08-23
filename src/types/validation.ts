import type { ValidationError } from './errors.js';

/**
 * 共通バリデーション結果
 */
export interface ValidationResult<T = unknown> {
  /** バリデーションが成功したかどうか */
  success: boolean;
  /** バリデーション成功時のデータ */
  data?: T;
  /** バリデーション失敗時のエラー */
  error?: ValidationError;
}

/**
 * 共通バリデーション関数の型
 */
// Re-export ValidationError from errors.ts
export type { ValidationError } from './errors.js';

export type ValidationFunction = (
  args: string[],
  options: Record<string, string | boolean>,
  params: Record<string, string>
) => Promise<ValidationResult> | ValidationResult;
