/**
 * `decopin build` が出すコマンドの木 (src/cli/build/tree.ts)。
 *
 * 木の形そのものを見る。CLI から通した証拠は
 * experiments/intent/build/build.test.ts の側にある
 */
import { describe, expect, test } from 'bun:test';

import { commandTree } from '../../src/cli/build/tree.ts';
import type { Route } from '../../src/core/build/scanner.ts';

function route(name: string, files: Route['files']): Route {
  return { name, dir: name, files };
}

const EMPTY = new Map();

describe('commandTree', () => {
  test('コマンドが 1 つなら木を開かない', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [route('hello', { cmd: 'app/hello/cmd.tsx' })],
      rootFiles: {},
      inherited: EMPTY,
    });
    expect(tree).toBe('Route (app)\n─ hello\n    cmd.tsx\n');
  });

  test('ルートコマンドは名前が空なので (root) と出す', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [{ name: '', dir: '', files: { cmd: 'app/cmd.tsx' } }],
      rootFiles: {},
      inherited: EMPTY,
    });
    expect(tree).toContain('─ (root)');
  });

  test('複数なら ┌ ├ └ で閉じる', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [
        route('a', { cmd: 'app/a/cmd.tsx' }),
        route('b', { cmd: 'app/b/cmd.tsx' }),
        route('c', { cmd: 'app/c/cmd.tsx' }),
      ],
      rootFiles: {},
      inherited: EMPTY,
    });
    expect(tree.split('\n').filter((line) => line.trim() !== '')).toEqual([
      'Route (app)',
      '┌ a',
      '│   cmd.tsx',
      '├ b',
      '│   cmd.tsx',
      '└ c',
      '    cmd.tsx',
    ]);
  });

  test('自分のディレクトリのファイルは読む順に並ぶ', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [
        route('stats', {
          // 宣言の順序ではなく CONVENTION_FILES の順で出る
          output: 'app/stats/output.tsx',
          argv: 'app/stats/argv.tsx',
          cmd: 'app/stats/cmd.tsx',
          data: 'app/stats/data.tsx',
        }),
      ],
      rootFiles: {},
      inherited: EMPTY,
    });
    expect(tree).toContain('cmd.tsx  argv.tsx  data.tsx  output.tsx');
  });

  test('継承は近い順に、app/ からの相対パスで出す', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [
        {
          name: 'user/list',
          dir: 'user/list',
          files: { cmd: 'app/user/list/cmd.tsx' },
        },
      ],
      rootFiles: {},
      inherited: new Map([
        ['', { error: 'app/error.tsx' }],
        [
          'user',
          { error: 'app/user/error.tsx', layout: 'app/user/layout.tsx' },
        ],
      ]),
    });
    expect(tree).toContain('↑ user/error.tsx  error.tsx  user/layout.tsx');
  });

  test('自分のディレクトリにあるものは ↑ に重ねない', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [
        route('crash', {
          cmd: 'app/crash/cmd.tsx',
          error: 'app/crash/error.tsx',
        }),
      ],
      rootFiles: {},
      inherited: new Map([['crash', { error: 'app/crash/error.tsx' }]]),
    });
    expect(tree).toContain('cmd.tsx  error.tsx');
    expect(tree).not.toContain('↑');
  });

  test('ルート直下にしか置けないものは別の節に 1 度だけ出す', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [route('hello', { cmd: 'app/hello/cmd.tsx' })],
      rootFiles: {
        env: 'app/env.tsx',
        'not-found': 'app/not-found.tsx',
      },
      // 同じ not-found.tsx が全コマンドに継承されるが、木には出さない
      inherited: new Map([['', { 'not-found': 'app/not-found.tsx' }]]),
    });
    expect(tree).toContain('Root (app)\n    not-found.tsx  env.tsx\n');
    expect(tree).not.toContain('↑');
  });

  test('ルート直下のファイルが無ければ節ごと出さない', () => {
    const tree = commandTree({
      appDir: 'app',
      routes: [route('hello', { cmd: 'app/hello/cmd.tsx' })],
      rootFiles: {},
      inherited: EMPTY,
    });
    expect(tree).not.toContain('Root (');
  });
});
