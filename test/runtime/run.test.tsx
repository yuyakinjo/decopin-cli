import { describe, expect, test } from 'bun:test';

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

/** command.tsx だけを持つルート */
function route(component: unknown): RouteLoaders {
  return { command: async () => ({ default: component }) };
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

  test('引数なしで呼ぶとコマンド一覧を出して exit 2', async () => {
    const result = await invoke(table, []);
    expect(result.code).toBe(2);
    expect(result.stdout).toContain('Usage: cli <command> [options]');
    expect(result.stdout).toContain('user list');
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
