/**
 * layout.tsx の継承連鎖 (ADR 7)。
 * layout は外側から内側へ包むので、ルート側のファイルが先頭に来ることを見る。
 */
import { describe, expect, test } from 'bun:test';

import type { InheritedFilesByDirectory } from '../../../../src/features/inherited/chain.ts';
import { createLayoutChains } from '../../../../src/features/inherited/layout/build.ts';
import { FILE_NAME } from '../../../../src/features/inherited/layout/definition.ts';

const inherited: InheritedFilesByDirectory = new Map([
  ['', { layout: 'app/layout.tsx', error: 'app/error.tsx' }],
  ['db', { layout: 'app/db/layout.tsx' }],
  ['db/migrate', { layout: 'app/db/migrate/layout.tsx' }],
]);

describe('createLayoutChains', () => {
  test('ルートの layout が一番外側 (先頭) に来る', () => {
    const chains = createLayoutChains(
      [{ name: 'db/migrate/up', dir: 'db/migrate' }],
      inherited
    );
    expect(chains.get('db/migrate/up')).toEqual([
      'app/layout.tsx',
      'app/db/layout.tsx',
      'app/db/migrate/layout.tsx',
    ]);
  });

  test('layout 以外の継承ファイル (error) は混ざらない', () => {
    const chains = createLayoutChains([{ name: 'hello', dir: '' }], inherited);
    expect(chains.get('hello')).toEqual(['app/layout.tsx']);
  });

  test('layout がどこにも無ければ空', () => {
    const chains = createLayoutChains(
      [{ name: 'hello', dir: '' }],
      new Map([['', { error: 'app/error.tsx' }]])
    );
    expect(chains.get('hello')).toEqual([]);
  });
});

describe('layout の定義', () => {
  test('継承カテゴリでも規約と同じ layout という名前を使う', () => {
    expect(FILE_NAME).toBe('layout');
  });
});
