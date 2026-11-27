/**
 * コマンドの stdout をソケットにつなぎ、少し待ってから読む当て木。
 * test/integration/runtime.test.ts が使う。
 *
 *   bun test/fixtures/slow-socket.ts <受け取った中身の書き先> <command> [args...]
 *
 * Node の child_process や Bun.spawn の 'pipe' が子に渡す stdout は、パイプ
 * ではなく socketpair の片側 (macOS で実測)。ただどちらも親がすぐ読むので、
 * 「読み手が遅い」形にならない。ここでは socketpair を自分で作り、読むのを
 * 遅らせる。
 *
 * socketpair は libc を bun:ffi で呼んで作る。テストランナーの中で呼ぶと、
 * 失敗したときに `bun test` ごと巻き込むので、別プロセスに分けている。
 * 受け取った中身はファイルに書き、終了コードと stderr を JSON で stdout に出す
 */
import { dlopen, FFIType, ptr } from 'bun:ffi';
import { closeSync } from 'node:fs';

const AF_UNIX = 1;
const SOCK_STREAM = 1;

const [received, ...command] = process.argv.slice(2);
if (received === undefined || command.length === 0) {
  console.error('usage: slow-socket.ts <out file> <command> [args...]');
  process.exit(2);
}

const libc = dlopen(
  process.platform === 'darwin' ? 'libSystem.B.dylib' : 'libc.so.6',
  {
    socketpair: {
      args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.ptr],
      returns: FFIType.i32,
    },
  }
);
const pair = new Int32Array(2);
if (libc.symbols.socketpair(AF_UNIX, SOCK_STREAM, 0, ptr(pair)) !== 0) {
  throw new Error('socketpair() failed');
}
const mine = pair[0] as number;
const theirs = pair[1] as number;

const proc = Bun.spawn(command, {
  stdin: 'ignore',
  stdout: theirs,
  stderr: 'pipe',
  env: { ...process.env, NO_COLOR: '1' },
});
// 子に渡した側は閉じる。持ったままだと、子が終わっても読み終わりが来ない
closeSync(theirs);

// 読み手が遅い。この間、子は書き残しを抱えたまま待つことになる
await Bun.sleep(300);

const [bytes, stderr, code] = await Promise.all([
  new Response(Bun.file(mine).stream()).bytes(),
  new Response(proc.stderr).text(),
  proc.exited,
]);
// stream は読み終えても fd を閉じない
closeSync(mine);
await Bun.write(received, bytes);
console.log(JSON.stringify({ code, stderr }));
