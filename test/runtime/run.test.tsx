import { describe, expect, test } from 'bun:test';

import { Exit, Line, run, Stderr, Text } from 'decopin-cli';
import type { RouteTable, RunOptions } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    chunks,
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

/** run を呼び、終了コードと fd ごとの出力をまとめて返す */
async function invoke(table: RouteTable, argv: string[], extra?: RunOptions) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    targets: { stdout, stderr },
    ...extra,
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

const table: RouteTable = {
  hello: async () => ({
    default: () => <Line>hello</Line>,
  }),
  'user/list': async () => ({
    default: () => <Line>alice</Line>,
  }),
  echo: async () => ({
    default: ({ argv }: { argv: readonly string[] }) => (
      <Line>{argv.join(',')}</Line>
    ),
  }),
  slow: async () => ({
    default: async () => {
      await Promise.resolve();
      return <Line>done</Line>;
    },
  }),
  boom: async () => ({
    default: () => {
      throw new Error('壊れました');
    },
  }),
  quit: async () => ({
    default: () => (
      <>
        <Line>bye</Line>
        <Exit code={3} />
      </>
    ),
  }),
  warn: async () => ({
    default: () => (
      <Stderr>
        <Line>注意</Line>
      </Stderr>
    ),
  }),
  broken: async () => ({ default: 'コンポーネントではない' }),
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

  test('残りの argv をコマンドに渡す', async () => {
    const result = await invoke(table, ['echo', 'a', 'b']);
    expect(result.stdout).toBe('a,b\n');
  });

  test('async コンポーネントを待つ', async () => {
    const result = await invoke(table, ['slow']);
    expect(result.stdout).toBe('done\n');
  });

  test('<Stderr> の中身は stderr に行く', async () => {
    const result = await invoke(table, ['warn']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('注意\n');
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
    expect(result.stderr).toContain('未知のコマンド: helo');
    expect(result.stderr).toContain('もしかして: hello');
  });

  test('候補がなければ利用できるコマンドを並べる', async () => {
    const result = await invoke(table, ['zzzzzz']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('利用できるコマンド: boom, broken, echo');
  });

  test('コマンド内の throw は exit 1 で stderr に出す', async () => {
    const result = await invoke(table, ['boom']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('壊れました');
  });

  test('default export がコンポーネントでなければ分かるエラーになる', async () => {
    const result = await invoke(table, ['broken']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('default export してください');
  });

  test('--no-color はコマンドに渡さず、色を落とす', async () => {
    const result = await invoke(table, ['echo', 'a', '--no-color'], {
      env: {},
    });
    expect(result.stdout).toBe('a\n');
  });

  test('端末でなくても色付きの環境なら装飾が出る (FORCE_COLOR)', async () => {
    const colored: RouteTable = {
      hi: async () => ({
        default: () => (
          <Line>
            <Text color="green">hi</Text>
          </Line>
        ),
      }),
    };
    const result = await invoke(colored, ['hi'], {
      env: { FORCE_COLOR: '1' },
    });
    expect(result.stdout).toBe('\x1b[32mhi\x1b[0m\n');
  });
});
