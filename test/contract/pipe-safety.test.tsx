/**
 * パイプを壊さないことの検査 (ADR 26)。
 *
 * `cli stats | grep README` のような使い方は、CLI が守るべき一番外側の
 * 約束なのに、機能を足すたびに壊しうる。ここは **app/ の全コマンドを掃いて**
 * 不変条件を確かめるので、個別に「今回はパイプを壊していないか」を
 * 思い出す必要がない。
 *
 * 守っている不変条件:
 *   1. stdout は端末かどうかで変わらない (色を除いて)
 *   2. stdout に画面制御が出ない (カーソル移動・消去・表示切替は stderr の仕事)
 *   3. 非 TTY の stdout に ANSI が一切出ない
 *   4. stdout は改行で終わる (空なら空)
 *   5. app/ の全コマンドがこの表にある
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run } from 'decopin-cli';
import type { RouteTable, StdinSource } from 'decopin-cli';

import { build } from '../../src/build/index.ts';

const ESC = String.fromCharCode(27);
/** 色や装飾の指定 (SGR)。これは端末かどうかで変わってよい */
const SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
/** 画面を動かす列。stdout に出たら事故 */
const SCREEN_CONTROL = new RegExp(`${ESC}\\[[0-9;?]*[A-HJKSTfhlsu]`);

/** パイプ越しに渡ってくる入力 */
function piped(text: string): StdinSource {
  return { isTTY: false, read: async () => text };
}

/**
 * 掃く対象。**新しいコマンドを足すとここが落ちる**ので、
 * 「パイプでどう見えるべきか」を決めるまで通らない
 */
const CASES: Record<string, { argv: string[]; stdin?: StdinSource }> = {
  config: { argv: ['config'] },
  count: { argv: ['count'], stdin: piped('a\nb\n\nc\n') },
  crash: { argv: ['crash'] },
  hello: { argv: ['hello', 'world'] },
  stats: { argv: ['stats'] },
  'stats --json': { argv: ['stats', '--json'] },
  // 失敗しても stdout は空のまま (ADR 29)
  'stats --json (失敗)': { argv: ['stats', '--limit', '99', '--json'] },
  upper: { argv: ['upper'], stdin: piped('shout') },
  'user/import': {
    argv: ['user', 'import'],
    stdin: piped('[{"name":"alice","email":"a@example.com"}]'),
  },
  'user/list': { argv: ['user', 'list'] },
  'user/show': { argv: ['user', 'show', 'alice'] },
  // notFound() の経路も stdout は空のまま (ADR 30)
  'user/show (見つからない)': { argv: ['user', 'show', 'nope'] },
  'user/show (見つからない, --json)': {
    argv: ['user', 'show', 'nope', '--json'],
  },
  '--help': { argv: ['--help'] },
  'hello --help': { argv: ['hello', '--help'] },
  '--version': { argv: ['--version'] },
  'unknown command': { argv: ['nope'] },
};

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

let table: RouteTable;
let workspace: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'decopin-pipe-'));
  await build({ appDir: 'app', workDir: '.decopin', outDir: workspace });
  const generated = (await import('../../.decopin/routes.ts')) as {
    routes: RouteTable;
  };
  table = generated.routes;
});

/** 1 回実行して fd ごとの文字列を返す */
async function invoke(
  name: keyof typeof CASES,
  isTTY: { stdout: boolean; stderr: boolean }
) {
  const entry = CASES[name] as { argv: string[]; stdin?: StdinSource };
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv: entry.argv,
    program: 'cli',
    // 色は環境変数ではなく isTTY だけで決まるようにする
    env: {},
    isTTY,
    targets: { stdout, stderr },
    stdin: entry.stdin ?? { isTTY: true, read: async () => '' },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

const names = Object.keys(CASES) as (keyof typeof CASES)[];

describe('パイプを壊さない', () => {
  test('app/ の全コマンドがこの表にある', async () => {
    const covered = new Set(
      names.map((name) => (CASES[name] as { argv: string[] }).argv.join('/'))
    );
    const missing = Object.keys(table).filter((route) => {
      if (route === '') return false;
      return ![...covered].some((argv) => argv.startsWith(route));
    });
    // 落ちたら、そのコマンドがパイプでどう見えるべきかを決めて CASES に足す
    expect(missing).toEqual([]);
  });

  for (const name of names) {
    describe(String(name), () => {
      test('stdout は端末かどうかで変わらない (色を除いて)', async () => {
        const onTerminal = await invoke(name, { stdout: true, stderr: true });
        const inPipe = await invoke(name, { stdout: false, stderr: false });
        // 色が落ちるのは表示の調整。中身が変わったら形式を変えている
        expect(inPipe.stdout).toBe(onTerminal.stdout.replace(SGR, ''));
        // 終了コードも表示先で変わってはいけない
        expect(inPipe.code).toBe(onTerminal.code);
      });

      test('stdout に画面制御が出ない', async () => {
        for (const isTTY of [
          { stdout: true, stderr: true },
          { stdout: false, stderr: false },
        ]) {
          const result = await invoke(name, isTTY);
          expect(SCREEN_CONTROL.test(result.stdout)).toBe(false);
        }
      });

      test('非 TTY の stdout に ANSI が残らない', async () => {
        const result = await invoke(name, { stdout: false, stderr: false });
        expect(result.stdout.includes(ESC)).toBe(false);
      });

      test('stdout は改行で終わる', async () => {
        const result = await invoke(name, { stdout: false, stderr: false });
        if (result.stdout === '') return;
        expect(result.stdout.endsWith('\n')).toBe(true);
      });
    });
  }
});

describe('後片付け', () => {
  test('一時ディレクトリを消す', async () => {
    await rm(workspace, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
