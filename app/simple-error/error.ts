// contextを使わないエラーハンドラーの例
export default async function simpleErrorHandler(error: unknown) {
  console.error('Simple error handler caught:', error);
  console.error('This handler does not use context!');
  process.exit(1);
}