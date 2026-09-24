/**
 * middleware.tsx の継承連鎖 (ADR 13)。
 * middleware はルート側から内側へ順に実行するので、外側が先頭に来ることを見る。
 */
import { describe, expect, test } from 'bun:test';

import type { InheritedFilesByDirectory } from '../../../../src/features/inherited/chain.ts';
import { createMiddlewareChains } from '../../../../src/features/inherited/middleware/build.ts';
import { FILE_NAME } from '../../../../src/features/inherited/middleware/definition.ts';

const inherited: InheritedFilesByDirectory = new Map([
  ['', { middleware: 'app/middleware.tsx' }],
  ['deploy', { middleware: 'app/deploy/middleware.tsx', layout: 'x.tsx' }],
]);

describe('createMiddlewareChains', () => {
  const routes = [
    { name: 'status', dir: '' },
    { name: 'deploy/prod', dir: 'deploy' },
    { name: 'deploy/stage/canary', dir: 'deploy/stage' },
  ];

  test('ルートの middleware から先に実行する並び', () => {
    const chains = createMiddlewareChains(routes, inherited);
    expect(chains.get('deploy/prod')).toEqual([
      'app/middleware.tsx',
      'app/deploy/middleware.tsx',
    ]);
  });

  test('ファイルの無い深い階層も祖先の middleware を順に通る', () => {
    const chains = createMiddlewareChains(routes, inherited);
    expect(chains.get('deploy/stage/canary')).toEqual([
      'app/middleware.tsx',
      'app/deploy/middleware.tsx',
    ]);
  });

  test('ルート直下のコマンドはルートの middleware だけ', () => {
    const chains = createMiddlewareChains(routes, inherited);
    expect(chains.get('status')).toEqual(['app/middleware.tsx']);
  });
});

describe('middleware の定義', () => {
  test('継承カテゴリでも規約と同じ middleware という名前を使う', () => {
    expect(FILE_NAME).toBe('middleware');
  });
});
