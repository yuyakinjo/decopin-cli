/**
 * `src/features/conventions/index.ts` の単体テスト。
 *
 * 規約ファイルの一覧 `CONVENTION_FILES` が、conventions/ 以下のフォルダと
 * 過不足なく対応しているかを見る。並び順そのものは
 * test/contract/file-conventions.test.tsx が固定しているので、ここでは
 * 「フォルダを足したのに一覧に載せ忘れた」側の抜けを拾う。
 */
import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { CONVENTION_FILES } from '../../../src/features/conventions/index.ts';

const DIR = join(process.cwd(), 'src/features/conventions');

/** definition.ts を持つフォルダ (= 規約ファイル 1 種類の実装入口) */
async function definitionFolders(): Promise<string[]> {
  const entries = await readdir(DIR, { withFileTypes: true });
  const folders: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await Bun.file(join(DIR, entry.name, 'definition.ts')).exists()) {
      folders.push(entry.name);
    }
  }
  return folders.sort();
}

describe('CONVENTION_FILES', () => {
  test('definition.ts を持つフォルダはすべて一覧に載っている', async () => {
    expect<string[]>([...CONVENTION_FILES].sort()).toEqual(
      await definitionFolders()
    );
  });

  test('同じ名前が 2 回出てこない', () => {
    expect(new Set(CONVENTION_FILES).size).toBe(CONVENTION_FILES.length);
  });

  test('名前は拡張子を含まない小文字のケバブケース (ファイル名の語幹になる)', () => {
    for (const name of CONVENTION_FILES) {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  test('唯一の必須ファイル cmd が先頭に来る (tree 表示や gen が読む順)', () => {
    expect(CONVENTION_FILES[0]).toBe('cmd');
  });
});
