/**
 * `--dry-run` (ADR 37)。
 *
 * 枠組みがするのは「予約して、剥がして、`dryRun: true` を渡す」だけ。
 * fs や fetch を差し替えて止めることはしない (Bun の静的 import 束縛には
 * 実行時の差し替えが届かないと実測で分かった)。従うのはコマンドの責任
 */
import { describe, expect, test } from 'bun:test';

import { Arg, Argv, Line, run } from 'decopin-cli';
import type { CommandContext, MiddlewareProps, RouteTable } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

const loader = (value: unknown) => async () => ({ default: value });

const seen: { where: string; dryRun: boolean }[] = [];

const table: RouteTable = {
  ship: {
    argv: loader(() => (
      <Argv>
        <Arg name="what" type="string" required />
      </Argv>
    )),
    middlewares: [
      loader(async ({ dryRun, next }: MiddlewareProps) => {
        seen.push({ where: 'middleware', dryRun });
        return next();
      }),
    ],
    data: loader(({ dryRun, args }: Omit<CommandContext, 'data'>) => {
      seen.push({ where: 'data', dryRun });
      return { what: args.what, dryRun };
    }),
    command: loader(({ dryRun, data }: CommandContext) => {
      seen.push({ where: 'command', dryRun });
      return (
        <Line>
          {dryRun
            ? `would ship ${String((data as { what: string }).what)}`
            : 'shipped'}
        </Line>
      );
    }),
  },
  plain: {
    command: loader(({ dryRun }: CommandContext) => (
      <Line>{String(dryRun)}</Line>
    )),
  },
};

async function invoke(argv: string[]) {
  seen.length = 0;
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    program: 'cli',
    env: {},
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

describe('--dry-run', () => {
  test('付ければ middleware / data / command の全部に dryRun: true が渡る', async () => {
    const result = await invoke(['ship', 'v1', '--dry-run']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('would ship v1\n');
    expect(seen).toEqual([
      { where: 'middleware', dryRun: true },
      { where: 'data', dryRun: true },
      { where: 'command', dryRun: true },
    ]);
  });

  test('無ければ false。宣言の無いコマンドにも渡る', async () => {
    expect((await invoke(['ship', 'v1'])).stdout).toBe('shipped\n');
    expect(seen.every((entry) => !entry.dryRun)).toBe(true);
    expect((await invoke(['plain'])).stdout).toBe('false\n');
    expect((await invoke(['plain', '--dry-run'])).stdout).toBe('true\n');
  });

  test('argv の検証には見せない (Unknown option にならない)', async () => {
    const result = await invoke(['ship', '--dry-run', 'v1']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
  });

  test('--json と一緒に使える。data に dryRun が渡っている', async () => {
    const result = await invoke(['ship', 'v1', '--json', '--dry-run']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ what: 'v1', dryRun: true });
  });

  test('-- より後ろの --dry-run は位置引数 (予約語として扱わない)', async () => {
    const result = await invoke(['ship', '--', '--dry-run']);
    expect(result.stdout).toBe('shipped\n');
    expect(seen[0]?.dryRun).toBe(false);
  });
});
