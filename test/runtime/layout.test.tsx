/**
 * Phase 5: layout.tsx の適用順 (ADR 7)。
 * 外側 = 上位ディレクトリ。error.tsx の出力も包まれる。
 */
import { describe, expect, test } from 'bun:test';

import { Line, run, Stdout } from 'decopin-cli';
import type {
  ErrorProps,
  LayoutProps,
  RouteLoaders,
  RouteTable,
} from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

async function invoke(table: RouteTable, argv: string[]) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

/** `label` で囲む layout */
const wrapper =
  (label: string) =>
  ({ children }: LayoutProps) => (
    <>
      <Line>{`<${label}>`}</Line>
      {children}
      <Line>{`</${label}>`}</Line>
    </>
  );

function loader(value: unknown, extra: Record<string, unknown> = {}) {
  return async () => ({ default: value, ...extra });
}

describe('layout.tsx', () => {
  test('外側 = 上位ディレクトリの順に包む', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        layouts: [loader(wrapper('root')), loader(wrapper('inner'))],
      },
    };
    const result = await invoke(table, ['x']);
    expect(result.stdout).toBe('<root>\n<inner>\nbody\n</inner>\n</root>\n');
  });

  test('layout が無ければそのまま出す', async () => {
    const table: RouteTable = {
      x: { command: loader(() => <Line>body</Line>) },
    };
    expect((await invoke(table, ['x'])).stdout).toBe('body\n');
  });

  test('async な layout も待つ', async () => {
    const asyncLayout = async ({ children }: LayoutProps) => {
      await Promise.resolve();
      return (
        <>
          <Line>head</Line>
          {children}
        </>
      );
    };
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        layouts: [loader(asyncLayout)],
      },
    };
    expect((await invoke(table, ['x'])).stdout).toBe('head\nbody\n');
  });

  test('children を使わない layout はコマンドの出力を捨てる', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        layouts: [loader(() => <Line>only layout</Line>)],
      },
    };
    expect((await invoke(table, ['x'])).stdout).toBe('only layout\n');
  });

  test('command.tsx が skipLayout を宣言すれば包まない', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>, { skipLayout: true }),
        layouts: [loader(wrapper('root'))],
      },
    };
    expect((await invoke(table, ['x'])).stdout).toBe('body\n');
  });

  test('default export がコンポーネントでない layout は分かるエラーになる', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        layouts: [loader('not a component')],
      },
    };
    const result = await invoke(table, ['x']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      'layout.tsx must default-export a component'
    );
  });
});

describe('layout.tsx とエラー表示', () => {
  const failing: RouteLoaders = {
    command: loader(() => {
      throw new Error('boom');
    }),
    errors: [loader(({ error }: ErrorProps) => <Line>{error.message}</Line>)],
    layouts: [loader(wrapper('root'))],
  };

  test('error.tsx の出力も layout に包まれる', async () => {
    const result = await invoke({ x: failing }, ['x']);
    expect(result.stderr).toBe('<root>\nboom\n</root>\n');
  });

  test('失敗したときは layout も stderr に出る (stdout を汚さない)', async () => {
    const result = await invoke({ x: failing }, ['x']);
    expect(result.stdout).toBe('');
  });

  test('error.tsx が skipLayout を宣言すれば包まない', async () => {
    const result = await invoke(
      {
        x: {
          ...failing,
          errors: [
            loader(({ error }: ErrorProps) => <Line>{error.message}</Line>, {
              skipLayout: true,
            }),
          ],
        },
      },
      ['x']
    );
    expect(result.stderr).toBe('boom\n');
  });

  test('組み込みの既定表示は layout に包まない', async () => {
    const result = await invoke(
      {
        x: {
          command: loader(() => {
            throw new Error('boom');
          }),
          layouts: [loader(wrapper('root'))],
        },
      },
      ['x']
    );
    expect(result.stderr).toContain('✖ boom');
    expect(result.stderr).not.toContain('<root>');
  });

  test('error.tsx の中で <Stdout> を使えば stdout に出せる', async () => {
    const result = await invoke(
      {
        x: {
          command: loader(() => {
            throw new Error('boom');
          }),
          errors: [
            loader(() => (
              <Stdout>
                <Line>on stdout</Line>
              </Stdout>
            )),
          ],
        },
      },
      ['x']
    );
    expect(result.stdout).toBe('on stdout\n');
    expect(result.stderr).toBe('');
  });
});
