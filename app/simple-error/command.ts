// contextを使わないコマンドでエラーを発生させる例
export default async function simpleErrorCommand() {
  console.log('About to throw an error...');
  throw new Error('This is a simple error without context!');
}