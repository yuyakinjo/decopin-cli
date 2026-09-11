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
    expect(tree.split('\n\n')[0]).toBe('Route (app)\n─ hello\n    ƒ cmd.tsx');
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
    expect(tree.split('\n\n')[0]?.split('\n')).toEqual([
      'Route (app)',
      '┌ a',
      '│   ƒ cmd.tsx',
      '├ b',
      '│   ƒ cmd.tsx',
      '└ c',
      '    ƒ cmd.tsx',
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
    expect(tree).toContain('ƒ cmd.tsx  ƒ argv.tsx  ƒ data.tsx  ƒ output.tsx');
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
    expect(tree).toContain('↑ user/error.tsx  ↑ error.tsx  ↑ user/layout.tsx');
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
    expect(tree).toContain('ƒ cmd.tsx  ƒ error.tsx');
    expect(tree.split('\n\n')[0]).not.toContain('↑');
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
    expect(tree).toContain('Root (app)\n    ¤ not-found.tsx  ¤ env.tsx');
    expect(tree.split('\n\n')[0]).not.toContain('↑');
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

describe('記号', () => {
  const INPUT = {
    appDir: 'app',
    routes: [
      {
        name: 'user/list',
        dir: 'user/list',
        files: { cmd: 'app/user/list/cmd.tsx' },
      },
    ],
    rootFiles: { env: 'app/env.tsx' },
    inherited: new Map([['user', { layout: 'app/user/layout.tsx' }]]),
  };

  test('3 つの種別を 1 桁の記号で区別し、読み方を木の下に置く', () => {
    const tree = commandTree(INPUT);
    expect(tree).toContain('ƒ cmd.tsx  ↑ user/layout.tsx');
    expect(tree).toContain('¤ env.tsx');
    expect(tree).toContain("ƒ  convention   placed in the command's own");
    expect(tree).toContain('↑  inherited    comes from a directory above');
    expect(tree).toContain('¤  root-only    applies to every command');
  });

  test('UTF-8 でない端末では ASCII に落とす', () => {
    const tree = commandTree({ ...INPUT, unicode: false });
    expect(tree).toContain('f cmd.tsx  ^ user/layout.tsx');
    expect(tree).toContain('* env.tsx');
    expect(/[ƒ↑¤─┌├└│]/.test(tree)).toBe(false);
  });
});
