/**
 * ルート直下にだけ置けるファイルの一覧 (ROOT_ONLY_FILES)。
 * 各定義のファイル名から組み立てられることと、継承ファイルとの重なり
 * (not-found はルート専用でも継承でもある) を見る。
 */
import { describe, expect, test } from 'bun:test';

import { INHERITED_FILES } from '../../../src/features/inherited/index.ts';
import { ROOT_ONLY_FILES } from '../../../src/features/root-only/index.ts';

describe('ROOT_ONLY_FILES', () => {
  test('global-error / not-found / env / version をこの順で持つ', () => {
    expect([...ROOT_ONLY_FILES]).toEqual([
      'global-error',
      'not-found',
      'env',
      'version',
    ]);
  });

  test('重複が無い', () => {
    expect(new Set(ROOT_ONLY_FILES).size).toBe(ROOT_ONLY_FILES.length);
  });

  test('継承ファイルと重なるのは not-found だけ', () => {
    // ルートの not-found.tsx は未知のコマンド用、継承は notFound() 用として両方に属する
    const inherited: readonly string[] = INHERITED_FILES;
    expect(ROOT_ONLY_FILES.filter((file) => inherited.includes(file))).toEqual([
      'not-found',
    ]);
  });
});
