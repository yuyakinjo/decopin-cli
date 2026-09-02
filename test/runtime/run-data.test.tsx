/**
 * `data.tsx` と `--json` (ADR 25)。
 *
 * データは表示より先に確定し、`cmd.tsx` は props で受けるだけ。
 * `--json` は view を呼ばずにデータをそのまま出す
 */
import { describe, expect, test } from 'bun:test';

import { Line, run } from 'decopin-cli';
import type { RouteLoaders, RouteTable } from 'decopin-cli';

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

const loader = (value: unknown) => async () => ({ default: value });

/** data.tsx を持つコマンド */
function withData(
  provide: unknown,
  view: unknown,
  extra: Partial<RouteLoaders> = {}
): RouteLoaders {
  return { cmd: loader(view), data: loader(provide), ...extra };
}

const table: RouteTable = {
  users: withData(
    () => ({ users: [{ name: 'alice' }, { name: 'bob' }], total: 2 }),
    ({ data }: { data: { users: { name: string }[]; total: number } }) => (
      <Line>
        {data.total}: {data.users.map((user) => user.name).join(', ')}
      </Line>
    )
  ),
  slow: withData(
    async () => {
      await Promise.resolve();
      return { ready: true };
    },
    ({ data }: { data: { ready: boolean } }) => (
      <Line>{String(data.ready)}</Line>
    )
  ),
  plain: { cmd: loader(() => <Line>no data here</Line>) },
  broken: withData('not a function', () => <Line>never</Line>),
  failing: withData(
    () => {
      throw new Error('database is down');
    },
    () => <Line>never</Line>
  ),
};

describe('data.tsx', () => {
  test('cmd.tsx は data を props で受ける', async () => {
    const result = await invoke(table, ['users']);
    expect(result).toEqual({ code: 0, stdout: '2: alice, bob\n', stderr: '' });
  });

  test('async な data.tsx を待つ', async () => {
    const result = await invoke(table, ['slow']);
    expect(result.stdout).toBe('true\n');
  });

  test('data.tsx が無いコマンドはそのまま動く', async () => {
    const result = await invoke(table, ['plain']);
    expect(result.stdout).toBe('no data here\n');
  });

  test('data.tsx の中の throw は通常のエラー経路に乗る', async () => {
    const result = await invoke(table, ['failing']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('database is down');
    expect(result.stdout).toBe('');
  });

  test('default export が関数でなければ誤りとして落ちる', async () => {
    const result = await invoke(table, ['broken']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('must default-export a function');
  });

  test('data.tsx は検証済みの入力を受け取る', async () => {
    const seen: unknown[] = [];
    const echo: RouteTable = {
      echo: withData(
        (context: { argv: readonly string[] }) => {
          seen.push(context.argv);
          return { got: context.argv.length };
        },
        ({ data }: { data: { got: number } }) => <Line>{data.got}</Line>
      ),
    };
    const result = await invoke(echo, ['echo', 'a', 'b']);
    expect(result.stdout).toBe('2\n');
    expect(seen).toEqual([['a', 'b']]);
  });
});

describe('--json', () => {
  test('view を呼ばずにデータをそのまま出す', async () => {
    const result = await invoke(table, ['users', '--json']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      users: [{ name: 'alice' }, { name: 'bob' }],
      total: 2,
    });
  });

  test('data.tsx が無ければ exit 2 で置き場所を教える', async () => {
    const result = await invoke(table, ['plain', '--json']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('app/plain/data.tsx');
    expect(result.stdout).toBe('');
  });

  test('--json 自体は位置引数として渡らない', async () => {
    const seen: unknown[] = [];
    const echo: RouteTable = {
      echo: withData(
        (context: { argv: readonly string[] }) => {
          seen.push([...context.argv]);
          return { ok: true };
        },
        () => <Line>never</Line>
      ),
    };
    await invoke(echo, ['echo', 'keep', '--json']);
    expect(seen).toEqual([['keep']]);
  });

  test('パイプでも勝手に JSON にはならない (明示だけ)', async () => {
    // 出力の形式を暗黙に変えると `cli users | grep alice` が壊れる
    const result = await invoke(table, ['users']);
    expect(result.stdout).toBe('2: alice, bob\n');
  });
});
