/**
 * 契約: 終了コード。
 *
 * `2` を「使い方の誤り」に割り当てるのは POSIX ツールの慣習 (grep / ls と同じ)。
 * SIGINT = 130 は生成される entry.ts が配線する (test/contract/build.test.ts)。
 */
import { describe, expect, test } from 'bun:test';

import {
  Argv,
  CliError,
  Env,
  Exit,
  Line,
  Option,
  run,
  Stdin,
  Var,
} from 'decopin-cli';
import type { RouteTable } from 'decopin-cli';

import { EXIT_CODE } from '../../src/runtime/exit.ts';

function loader(value: unknown) {
  return async () => ({ default: value });
}

async function codeOf(
  table: RouteTable,
  argv: string[],
  extra: Parameters<typeof run>[1] = {}
): Promise<number> {
  const sink = { write: () => {} };
  return run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    targets: { stdout: sink, stderr: sink },
    ...extra,
  });
}

describe('終了コードの規約', () => {
  test('0: 成功', async () => {
    expect(
      await codeOf({ x: { command: loader(() => <Line>ok</Line>) } }, ['x'])
    ).toBe(EXIT_CODE.success);
  });

  test('1: command 内の throw (実行時エラー)', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => {
          throw new Error('boom');
        }),
      },
    };
    expect(await codeOf(table, ['x'])).toBe(EXIT_CODE.runtime);
  });

  test('2: 引数の検証失敗', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>ok</Line>),
        argv: loader(() => (
          <Argv>
            <Option name="n" type="number" required />
          </Argv>
        )),
      },
    };
    expect(await codeOf(table, ['x'])).toBe(EXIT_CODE.usage);
  });

  test('2: 未知のコマンド', async () => {
    const table: RouteTable = { x: { command: loader(() => null) } };
    expect(await codeOf(table, ['nope'])).toBe(EXIT_CODE.usage);
  });

  test('2: サブコマンド未指定 (グループ)', async () => {
    const table: RouteTable = { 'user/list': { command: loader(() => null) } };
    expect(await codeOf(table, ['user'])).toBe(EXIT_CODE.usage);
  });

  test('2: 未知のオプション', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>ok</Line>),
        argv: loader(() => <Argv />),
      },
    };
    expect(await codeOf(table, ['x', '--nope'])).toBe(EXIT_CODE.usage);
  });

  test('2: env が足りない', async () => {
    const table: RouteTable = { x: { command: loader(() => null) } };
    expect(
      await codeOf(table, ['x'], {
        envFile: loader(() => (
          <Env>
            <Var name="DECOPIN_REQUIRED_FOR_TEST" type="string" required />
          </Env>
        )),
      })
    ).toBe(EXIT_CODE.usage);
  });

  test('2: stdin が必須なのに端末で実行された', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>ok</Line>),
        stdin: loader(() => <Stdin mode="text" required />),
      },
    };
    expect(
      await codeOf(table, ['x'], {
        stdin: { isTTY: true, read: async () => '' },
      })
    ).toBe(EXIT_CODE.usage);
  });

  test('任意: <Exit code={n} />', async () => {
    const table: RouteTable = {
      x: { command: loader(() => <Exit code={42} />) },
    };
    expect(await codeOf(table, ['x'])).toBe(42);
  });

  test('任意: CliError の exitCode', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => {
          throw new CliError('nope', { exitCode: 7 });
        }),
      },
    };
    expect(await codeOf(table, ['x'])).toBe(7);
  });

  test('130 は SIGINT のための定数 (生成される entry が使う)', () => {
    expect(EXIT_CODE.interrupted).toBe(130);
  });
});
