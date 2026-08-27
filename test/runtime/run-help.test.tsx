/**
 * `help.tsx` による上書き。
 * 出力先と終了コードの表そのものは test/contract/routing.test.tsx にある。
 */
import { describe, expect, test } from 'bun:test';

import { Line, run, Text } from 'decopin-cli';
import type { HelpProps, RouteTable } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

async function invoke(
  table: RouteTable,
  argv: string[],
  extra: { helps?: Record<string, () => Promise<unknown>> } = {}
) {
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

function loader(value: unknown, extra: Record<string, unknown> = {}) {
  return async () => ({ default: value, ...extra });
}

const table: RouteTable = {
  hello: { command: loader(() => <Line>hello</Line>) },
  'user/list': { command: loader(() => <Line>alice</Line>) },
  'user/import': { command: loader(() => <Line>imported</Line>) },
};

describe('help.tsx による上書き', () => {
  const helpView = ({ auto, program, command }: HelpProps) => (
    <>
      {auto}
      <Line>
        <Text dim>
          example: {program} {command}
        </Text>
      </Line>
    </>
  );

  test('コマンド単位 (キーはルート名)', async () => {
    const result = await invoke(table, ['hello', '--help'], {
      helps: { hello: loader(helpView) },
    });
    expect(result.stdout).toContain('Usage: cli hello');
    expect(result.stdout).toContain('example: cli hello');
  });

  test('グループ単位 (キーはディレクトリ)', async () => {
    const result = await invoke(table, ['user', '--help'], {
      helps: { user: loader(helpView) },
    });
    expect(result.stdout).toContain('Usage: cli user <command>');
    expect(result.stdout).toContain('example: cli user');
  });

  test('ルート単位 (キーは空文字)', async () => {
    const result = await invoke(table, ['--help'], {
      helps: { '': loader(helpView) },
    });
    expect(result.stdout).toContain('example: cli ');
  });

  test('サブコマンド名は空白区切りで渡る', async () => {
    const result = await invoke(table, ['user', 'list', '--help'], {
      helps: { 'user/list': loader(helpView) },
    });
    expect(result.stdout).toContain('example: cli user list');
  });

  test('auto を捨てて全部自前で書ける', async () => {
    const result = await invoke(table, ['hello', '--help'], {
      helps: { hello: loader(() => <Line>my own help</Line>) },
    });
    expect(result.stdout).toBe('my own help\n');
  });

  test('async な help.tsx も待つ', async () => {
    const result = await invoke(table, ['hello', '--help'], {
      helps: {
        hello: loader(async () => {
          await Promise.resolve();
          return <Line>later</Line>;
        }),
      },
    });
    expect(result.stdout).toBe('later\n');
  });

  test('help.tsx が失敗したら組み込みの表示に戻る', async () => {
    const result = await invoke(table, ['hello', '--help'], {
      helps: {
        hello: loader(() => {
          throw new Error('broken help');
        }),
      },
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Usage: cli hello');
  });

  test('コンポーネントを default export していなければ組み込みに戻る', async () => {
    const result = await invoke(table, ['hello', '--help'], {
      helps: { hello: loader('not a component') },
    });
    expect(result.stdout).toContain('Usage: cli hello');
  });

  test('グループ help を暗黙に出す場合も上書きが効き、stderr に行く', async () => {
    const result = await invoke(table, ['user'], {
      helps: { user: loader(helpView) },
    });
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('example: cli user');
  });
});

describe('help.tsx と layout', () => {
  const layout = loader(({ children }: { children: unknown }) => (
    <>
      <Line>[layout]</Line>
      {children as never}
    </>
  ));

  const withLayout: RouteTable = {
    hello: {
      command: loader(() => <Line>hello</Line>),
      layouts: [layout],
    },
  };

  test('組み込みの表示は layout に包まない', async () => {
    const result = await invoke(withLayout, ['hello', '--help']);
    expect(result.stdout).not.toContain('[layout]');
  });

  test('上書きは利用者の出力なので layout に包む', async () => {
    const result = await invoke(withLayout, ['hello', '--help'], {
      helps: { hello: loader(() => <Line>mine</Line>) },
    });
    expect(result.stdout).toBe('[layout]\nmine\n');
  });

  test('skipLayout で外せる', async () => {
    const result = await invoke(withLayout, ['hello', '--help'], {
      helps: {
        hello: loader(() => <Line>mine</Line>, { skipLayout: true }),
      },
    });
    expect(result.stdout).toBe('mine\n');
  });
});
