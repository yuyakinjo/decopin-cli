/**
 * `--json` のときのエラー出力 (ADR 29)。
 *
 * JSON を頼まれた相手に人間向けの文面を返すとパーサが壊れる。
 * 失敗も stderr に構造化して出し、stdout は空のまま保つ
 */
import { describe, expect, test } from 'bun:test';

import { Arg, Argv, Line, run, Type } from 'decopin-cli';
import type { RouteTable } from 'decopin-cli';

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
  env: Record<string, string | undefined> = {}
) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1', ...env },
    program: 'cli',
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

const loader = (value: unknown) => async () => ({ default: value });

/** 人間向けの表示。--json では通らないことを確かめるための目印 */
const humanView = loader(() => <Line>HUMAN VIEW</Line>);

const table: RouteTable = {
  boom: {
    cmd: loader(() => <Line>never</Line>),
    data: loader(() => {
      throw new Error('database is down');
    }),
    errors: [humanView],
  },
  strict: {
    cmd: loader(({ data }: { data: { n: number } }) => <Line>{data.n}</Line>),
    data: loader(() => ({ n: 1 })),
    argv: loader(() => (
      <Argv>
        <Arg name="count" required>
          <Type.Number min={1} max={3} integer />
        </Arg>
      </Argv>
    )),
  },
  plain: { cmd: loader(() => <Line>hi</Line>) },
};

/** stderr の JSON を読む */
function payload(stderr: string): {
  error: {
    code: string;
    message: string;
    exitCode: number;
    issues?: string[];
    trace?: string[];
  };
} {
  return JSON.parse(stderr) as ReturnType<typeof payload>;
}

describe('--json のときの失敗', () => {
  test('コマンド内の throw が構造化されて stderr に出る', async () => {
    const result = await invoke(table, ['boom', '--json']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(payload(result.stderr).error).toMatchObject({
      code: 'runtime',
      message: 'database is down',
      exitCode: 1,
    });
  });

  test('error.tsx (人間向け表示) は通らない', async () => {
    // JSON を頼まれた相手に人間向けの見た目を返すとパーサが壊れる
    const result = await invoke(table, ['boom', '--json']);
    expect(result.stderr).not.toContain('HUMAN VIEW');
  });

  test('引数の検証の失敗も構造化される', async () => {
    const result = await invoke(table, ['strict', '99', '--json']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    const { error } = payload(result.stderr);
    expect(error.code).toBe('validation');
    expect(error.exitCode).toBe(2);
  });

  test('data.tsx が無いのに --json なら、その理由も構造化される', async () => {
    const result = await invoke(table, ['plain', '--json']);
    expect(result.code).toBe(2);
    expect(payload(result.stderr).error.message).toContain(
      'app/plain/data.tsx'
    );
  });

  test('理由が複数あるときは issues に並ぶ', async () => {
    const many: RouteTable = {
      two: {
        cmd: loader(() => <Line>never</Line>),
        data: loader(() => ({ n: 1 })),
        argv: loader(() => (
          <Argv>
            <Arg name="a" required type="number" />
            <Arg name="b" required type="number" />
          </Argv>
        )),
      },
    };
    const result = await invoke(many, ['two', '--json']);
    const { error } = payload(result.stderr);
    expect((error.issues ?? []).length).toBeGreaterThan(1);
  });

  test('--json 無しなら今までどおり人間向けの表示', async () => {
    const result = await invoke(table, ['boom']);
    expect(result.stderr).toContain('HUMAN VIEW');
    expect(result.stderr).not.toContain('"code"');
  });
});

describe('DECOPIN_DEBUG=1 のときの --json', () => {
  test('既定では trace は無い (形を増やさない)', async () => {
    const result = await invoke(table, ['boom', '--json']);
    expect(payload(result.stderr).error.trace).toBeUndefined();
  });

  test('入っていれば error.trace に cause の連鎖が並び、JSON のまま読める', async () => {
    const result = await invoke(table, ['boom', '--json'], {
      DECOPIN_DEBUG: '1',
    });
    const { error } = payload(result.stderr);
    expect(error.code).toBe('runtime');
    expect(
      error.trace?.some((l) =>
        l.startsWith('Caused by: Error: database is down')
      )
    ).toBe(true);
    expect(
      error.trace?.some((l) => l.includes('run-json-error.test.tsx'))
    ).toBe(true);
    expect(result.stdout).toBe('');
  });
});
