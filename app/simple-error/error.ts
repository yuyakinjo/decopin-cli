import type { ErrorHandler } from '../../dist/types/index.js';

// contextを使わないエラーハンドラーの例
export default async function createErrorHandler(error: unknown): Promise<ErrorHandler> {
  console.error('Simple error handler caught:', error);
  console.error('This handler does not use context!');
  process.exit(1);
};