/**
 * 継承ファイルの連鎖の組み立て (ADR 7 / ADR 13)。
 * ディレクトリから親へ向かって継承ファイルを拾う順番と、
 * 全ルート分をまとめて並べるときの向き (近い順 / 外側から) を見る。
 */
import { describe, expect, test } from 'bun:test';

import {
  createInheritedChains,
  inheritedChain,
  type InheritedFilesByDirectory,
} from '../../../src/features/inherited/chain.ts';
import { INHERITED_FILES } from '../../../src/features/inherited/index.ts';

/** app/ 直下・user/・user/admin/ に継承ファイルがある構成 */
const inherited: InheritedFilesByDirectory = new Map([
  ['', { error: 'app/error.tsx', layout: 'app/layout.tsx' }],
  ['user', { error: 'app/user/error.tsx' }],
  [
    'user/admin',
    { error: 'app/user/admin/error.tsx', layout: 'app/user/admin/layout.tsx' },
  ],
]);

describe('inheritedChain', () => {
  test('自分 → 親 → ルートの近い順に並ぶ', () => {
    expect(inheritedChain(inherited, 'user/admin', 'error')).toEqual([
      'app/user/admin/error.tsx',
      'app/user/error.tsx',
      'app/error.tsx',
    ]);
  });

  test('途中の階層に無いファイルは飛ばす', () => {
    expect(inheritedChain(inherited, 'user/admin', 'layout')).toEqual([
      'app/user/admin/layout.tsx',
      'app/layout.tsx',
    ]);
  });

  test('ルート (空文字) のディレクトリはルートのファイルだけを見る', () => {
    expect(inheritedChain(inherited, '', 'error')).toEqual(['app/error.tsx']);
  });

  test('継承ファイルの無いディレクトリも親のファイルを受け継ぐ', () => {
    // user/admin/audit にはファイルが無いが、上の 3 階層分を拾う
    expect(inheritedChain(inherited, 'user/admin/audit', 'error')).toEqual([
      'app/user/admin/error.tsx',
      'app/user/error.tsx',
      'app/error.tsx',
    ]);
  });

  test('どこにも無い種類は空の並び', () => {
    expect(inheritedChain(inherited, 'user/admin', 'middleware')).toEqual([]);
  });

  test('名前が前方一致するだけの兄弟ディレクトリは親として扱わない', () => {
    // "user-group" は "user" の子ではない
    expect(inheritedChain(inherited, 'user-group', 'error')).toEqual([
      'app/error.tsx',
    ]);
  });
});

describe('createInheritedChains', () => {
  const routes = [
    { name: 'hello', dir: '' },
    { name: 'user/list', dir: 'user' },
    { name: 'user/admin/ban', dir: 'user/admin' },
  ];

  test('nearest-first はルート名ごとに近い順のまま', () => {
    const chains = createInheritedChains(
      routes,
      inherited,
      'error',
      'nearest-first'
    );
    expect([...chains.keys()]).toEqual([
      'hello',
      'user/list',
      'user/admin/ban',
    ]);
    expect(chains.get('user/list')).toEqual([
      'app/user/error.tsx',
      'app/error.tsx',
    ]);
  });

  test('outer-first は外側 (ルート) から内側へ反転する', () => {
    const chains = createInheritedChains(
      routes,
      inherited,
      'error',
      'outer-first'
    );
    expect(chains.get('user/admin/ban')).toEqual([
      'app/error.tsx',
      'app/user/error.tsx',
      'app/user/admin/error.tsx',
    ]);
  });

  test('該当ファイルが無いルートも空配列でキーを持つ', () => {
    const chains = createInheritedChains(
      routes,
      inherited,
      'not-found',
      'nearest-first'
    );
    expect(chains.get('hello')).toEqual([]);
    expect(chains.size).toBe(3);
  });
});

describe('INHERITED_FILES', () => {
  test('継承される 4 種類を各定義のファイル名で持つ', () => {
    expect([...INHERITED_FILES]).toEqual([
      'error',
      'not-found',
      'layout',
      'middleware',
    ]);
  });
});
