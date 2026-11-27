import { afterEach, describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';

import { Exit, Line, run, Stderr, Text } from 'decopin-cli';
import type { RouteLoaders, RouteTable, RunOptions } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

/** cmd.tsx だけを持つルート */
function route(component: unknown): RouteLoaders {
  return { cmd: async () => ({ default: component }) };
}

/** run を呼び、終了コードと fd ごとの出力をまとめて返す */
async function invoke(table: RouteTable, argv: string[], extra?: RunOptions) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    targets: { stdout, stderr },
    ...extra,
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

const table: RouteTable = {
  hello: route(() => <Line>hello</Line>),
  'user/list': route(() => <Line>alice</Line>),
  echo: route(({ argv }: { argv: readonly string[] }) => (
    <Line>{argv.join(',')}</Line>
  )),
  slow: route(async () => {
    await Promise.resolve();
    return <Line>done</Line>;
  }),
  boom: route(() => {
    throw new Error('something broke');
  }),
  quit: route(() => (
    <>
      <Line>bye</Line>
      <Exit code={3} />
    </>
  )),
  warn: route(() => (
    <Stderr>
      <Line>careful</Line>
    </Stderr>
  )),
  broken: route('not a component'),
};

describe('run', () => {
  test('コマンドを実行して stdout に出す', async () => {
    const result = await invoke(table, ['hello']);
    expect(result).toEqual({ code: 0, stdout: 'hello\n', stderr: '' });
  });

  test('default export をメソッド化せず通常の関数として呼ぶ', async () => {
    const bindingTable: RouteTable = {
      binding: route(function command(this: unknown) {
        return <Line>{this === undefined ? 'unbound' : 'bound'}</Line>;
      }),
    };
    const result = await invoke(bindingTable, ['binding']);
    expect(result.stdout).toBe('unbound\n');
  });

  test('サブコマンドの階層を解決する', async () => {
    const result = await invoke(table, ['user', 'list']);
    expect(result.stdout).toBe('alice\n');
  });

  test('argv.tsx がなければ検証せず、生の argv を渡す', async () => {
    const result = await invoke(table, ['echo', 'a', '--anything']);
    expect(result.stdout).toBe('a,--anything\n');
    expect(result.code).toBe(0);
  });

  test('async コンポーネントを待つ', async () => {
    const result = await invoke(table, ['slow']);
    expect(result.stdout).toBe('done\n');
  });

  test('<Stderr> の中身は stderr に行く', async () => {
    const result = await invoke(table, ['warn']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('careful\n');
  });

  test('<Exit> の終了コードを返す', async () => {
    const result = await invoke(table, ['quit']);
    expect(result.code).toBe(3);
    expect(result.stdout).toBe('bye\n');
  });

  test('未知のコマンドは exit 2 で、候補を stderr に出す', async () => {
    const result = await invoke(table, ['helo']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: helo');
    expect(result.stderr).toContain('Did you mean: hello');
  });

  test('グループ (cmd.tsx を持たないディレクトリ) は配下の一覧を出す', async () => {
    const result = await invoke(table, ['user']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage: cli user <command> [options]');
    expect(result.stderr).toContain('list');
    // 他のグループのコマンドは出さない
    expect(result.stderr).not.toContain('hello');
  });

  test('候補がなければ利用できるコマンドを並べる', async () => {
    const result = await invoke(table, ['zzzzzz']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Available commands: boom, broken, echo');
  });

  test('コマンド内の throw は exit 1 で stderr に出す', async () => {
    const result = await invoke(table, ['boom']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('something broke');
  });

  test('default export がコンポーネントでなければ分かるエラーになる', async () => {
    const result = await invoke(table, ['broken']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('must default-export a component');
  });

  test('引数なしで呼ぶとコマンド一覧を stderr に出して exit 2', async () => {
    const result = await invoke(table, []);
    expect(result.code).toBe(2);
    // コマンドが確定しないまま終わったので stderr + exit 2 (test/contract/routing.test.tsx)
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage: cli <command> [options]');
    expect(result.stderr).toContain('user list');
  });

  test('--help だけならコマンド一覧を出して exit 0', async () => {
    const result = await invoke(table, ['--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Commands:');
  });

  test('--version は version.tsx がなければ exit 2', async () => {
    const result = await invoke(table, ['hello', '--version']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('No version is configured');
  });

  test('--no-color はコマンドに渡さず、色を落とす', async () => {
    const result = await invoke(table, ['echo', 'a', '--no-color'], {
      env: {},
    });
    expect(result.stdout).toBe('a\n');
  });

  test('端末でなくても色付きの環境なら装飾が出る (FORCE_COLOR)', async () => {
    const colored: RouteTable = {
      hi: route(() => (
        <Line>
          <Text color="green">hi</Text>
        </Line>
      )),
    };
    const result = await invoke(colored, ['hi'], {
      env: { FORCE_COLOR: '1' },
    });
    expect(result.stdout).toBe('\x1b[32mhi\x1b[0m\n');
  });
});

/**
 * 読み手が追いつかないパイプの代役 (test/core/renderer/writer.test.ts と同じ)。
 * 書かれたら `wrote` が解ける。'drain' を出すまで書き残しを抱えたままになる
 */
function clogged() {
  const { promise: wrote, resolve } = Promise.withResolvers<void>();
  const pipe = Object.assign(new EventEmitter(), {
    writable: true,
    wrote,
    write: (_chunk: string) => {
      resolve();
      return false;
    },
  });
  made.push(pipe);
  return pipe;
}

const made: EventEmitter[] = [];

// 途中で落ちたテストが詰まった先を残すと、このあと run() を呼ぶテストが
// 巻き添えで止まる (書き残しの控えはプロセスで 1 つ)。必ず流し切る
afterEach(() => {
  for (const pipe of made.splice(0)) pipe.emit('drain');
});

/** 少し待っても決着しないか */
async function stillWaiting(promise: Promise<unknown>): Promise<boolean> {
  return Promise.race([
    promise.then(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10)),
  ]);
}

describe('書き残しが流れ切ってから返す。呼び出し側はすぐ process.exit するため (ADR 54)', () => {
  test('stdout が詰まっていたら、流れ切るまで返さない', async () => {
    const stdout = clogged();
    const done = run(table, {
      argv: ['hello'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout, stderr: recorder() },
    });

    // 書き終えたあとも、流れ切るまでは返ってこない
    await stdout.wrote;
    expect(await stillWaiting(done)).toBe(true);

    stdout.emit('drain');
    expect(await done).toBe(0);
  });

  test('失敗して stderr に出したときも、流れ切るまで返さない', async () => {
    const stderr = clogged();
    const done = run(table, {
      argv: ['boom'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout: recorder(), stderr },
    });

    await stderr.wrote;
    expect(await stillWaiting(done)).toBe(true);

    stderr.emit('drain');
    expect(await done).toBe(1);
  });
});
