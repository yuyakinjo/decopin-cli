/**
 * Phase 4 の完了条件: エラー経路のフォールバック順が仕様どおり (test/contract/routing.test.tsx)。
 * 近い error.tsx → 親の error.tsx → global-error.tsx → 組み込み。
 */
import { describe, expect, test } from 'bun:test';

import { CliError, Exit, Line, run, Stdout, Text } from 'decopin-cli';
import type { ErrorProps, RouteLoaders, RouteTable } from 'decopin-cli';

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
  globalError?: () => Promise<unknown>
) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    globalError,
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

/** 投げるコマンドと、渡された error.tsx の並びを持つルート */
function failing(
  errors: Array<(props: ErrorProps) => unknown> = [],
  thrown: unknown = new Error('boom')
): RouteLoaders {
  return {
    command: async () => ({
      default: () => {
        throw thrown;
      },
    }),
    errors: errors.map((handler) => async () => ({ default: handler })),
  };
}

const asHandler = (label: string) => (props: ErrorProps) => (
  <Line>
    {label}: {props.error.message}
  </Line>
);

describe('フォールバック順', () => {
  test('自分のディレクトリの error.tsx が最優先', async () => {
    const result = await invoke(
      { x: failing([asHandler('own'), asHandler('parent')]) },
      ['x'],
      async () => ({ default: asHandler('global') })
    );
    expect(result.stderr).toBe('own: boom\n');
  });

  test('自分に無ければ親の error.tsx', async () => {
    const result = await invoke(
      { x: failing([asHandler('parent')]) },
      ['x'],
      async () => ({ default: asHandler('global') })
    );
    expect(result.stderr).toBe('parent: boom\n');
  });

  test('error.tsx が無ければ global-error.tsx', async () => {
    const result = await invoke({ x: failing() }, ['x'], async () => ({
      default: asHandler('global'),
    }));
    expect(result.stderr).toBe('global: boom\n');
  });

  test('どれも無ければ組み込みの表示', async () => {
    const result = await invoke({ x: failing() }, ['x']);
    expect(result.stderr).toContain('✖ boom');
  });

  test('error.tsx が自分で失敗したら次の候補に進む', async () => {
    const broken = () => {
      throw new Error('handler is broken');
    };
    const result = await invoke({ x: failing([broken]) }, ['x'], async () => ({
      default: asHandler('global'),
    }));
    expect(result.stderr).toBe('global: boom\n');
  });

  test('全部失敗したら組み込みが理由も添える', async () => {
    const broken = () => {
      throw new Error('handler is broken');
    };
    const result = await invoke({ x: failing([broken]) }, ['x']);
    expect(result.stderr).toContain('✖ boom');
    expect(result.stderr).toContain('An error handler itself failed');
    expect(result.stderr).toContain('handler is broken');
  });

  test('default export がコンポーネントでない error.tsx は飛ばす', async () => {
    const result = await invoke(
      {
        x: {
          command: async () => ({
            default: () => {
              throw new Error('boom');
            },
          }),
          errors: [async () => ({ default: 'not a component' })],
        },
      },
      ['x'],
      async () => ({ default: asHandler('global') })
    );
    expect(result.stderr).toBe('global: boom\n');
  });
});

describe('error.tsx の props と出力先', () => {
  test('既定の出力先は stderr', async () => {
    const result = await invoke({ x: failing([asHandler('own')]) }, ['x']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('own: boom\n');
  });

  test('<Stdout> で stdout に出すこともできる', async () => {
    const handler = () => (
      <Stdout>
        <Line>on stdout</Line>
      </Stdout>
    );
    const result = await invoke({ x: failing([handler]) }, ['x']);
    expect(result.stdout).toBe('on stdout\n');
    expect(result.stderr).toBe('');
  });

  test('argv と cwd も渡る', async () => {
    const handler = (props: ErrorProps) => (
      <Line>
        {props.argv.join(',')}|{props.cwd}
      </Line>
    );
    const result = await invoke({ x: failing([handler]) }, ['x', 'a', 'b']);
    expect(result.stderr).toBe(`a,b|${process.cwd()}\n`);
  });

  test('async な error.tsx も待つ', async () => {
    const handler = async (props: ErrorProps) => {
      await Promise.resolve();
      return <Line>later: {props.error.message}</Line>;
    };
    const result = await invoke({ x: failing([handler]) }, ['x']);
    expect(result.stderr).toBe('later: boom\n');
  });

  test('kind で場合分けできる', async () => {
    const handler = (props: ErrorProps) => (
      <Line>
        <Text>{props.error.kind}</Text>
      </Line>
    );
    const table: RouteTable = {
      x: {
        command: async () => ({ default: () => <Line>ok</Line> }),
        argv: async () => ({
          default: () => null,
        }),
        errors: [async () => ({ default: handler })],
      },
    };
    // argv.tsx が <Argv> を返していないので宣言の誤り = runtime
    const result = await invoke(table, ['x']);
    expect(result.stderr).toBe('runtime\n');
  });
});

describe('終了コード', () => {
  test('検証エラーは 2', async () => {
    const result = await invoke(
      {
        x: failing(
          [],
          new CliError('bad', { kind: 'validation', exitCode: 2 })
        ),
      },
      ['x']
    );
    expect(result.code).toBe(2);
  });

  test('実行時エラーは 1', async () => {
    const result = await invoke({ x: failing() }, ['x']);
    expect(result.code).toBe(1);
  });

  test('error.tsx の <Exit> が既定を上書きする', async () => {
    const handler = (props: ErrorProps) => (
      <>
        <Line>{props.error.message}</Line>
        <Exit code={42} />
      </>
    );
    const result = await invoke({ x: failing([handler]) }, ['x']);
    expect(result.code).toBe(42);
  });

  test('CliError の exitCode を尊重する', async () => {
    const result = await invoke(
      { x: failing([], new CliError('nope', { exitCode: 7 })) },
      ['x']
    );
    expect(result.code).toBe(7);
  });
});
