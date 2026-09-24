/**
 * `writeTemplates()`: 雛形を排他的に書く。
 *
 * 新しいファイルだけを作り、既にあるもの (シンボリックリンクを含む) は
 * 触らずに skipped へ回すこと、「既にある」以外の失敗は握りつぶさないことを見る
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeTemplates } from '../../../src/core/scaffold/write.ts';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'decopin-scaffold-'));
});

afterEach(async () => {
  // 書き込み禁止にしたディレクトリがあっても消せるように戻す
  await chmod(dir, 0o700).catch(() => {});
  await chmod(join(dir, 'locked'), 0o700).catch(() => {});
  await rm(dir, { recursive: true, force: true });
});

describe('writeTemplates', () => {
  test('入れ子のディレクトリも作って書き、渡した順に created を返す', async () => {
    const result = await writeTemplates(dir, {
      'a.txt': 'A',
      'deep/nested/b.txt': 'B',
      'deep/c.txt': 'C',
    });
    expect(result).toEqual({
      created: ['a.txt', 'deep/nested/b.txt', 'deep/c.txt'],
      skipped: [],
    });
    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe('A');
    expect(await readFile(join(dir, 'deep/nested/b.txt'), 'utf8')).toBe('B');
    expect(await readFile(join(dir, 'deep/c.txt'), 'utf8')).toBe('C');
  });

  test('既にあるファイルは中身を残して skipped に入れる', async () => {
    await writeFile(join(dir, 'keep.txt'), 'original');
    const result = await writeTemplates(dir, {
      'keep.txt': 'replaced',
      'new.txt': 'fresh',
    });
    expect(result).toEqual({ created: ['new.txt'], skipped: ['keep.txt'] });
    expect(await readFile(join(dir, 'keep.txt'), 'utf8')).toBe('original');
  });

  test('シンボリックリンクはたどらずに残す (リンク先を書き換えない)', async () => {
    const outside = join(dir, 'outside.txt');
    await writeFile(outside, 'secret');
    await symlink(outside, join(dir, 'link.txt'));
    // 行き先の無いリンクも「既にある」とみなす
    await symlink(join(dir, 'missing.txt'), join(dir, 'dangling.txt'));

    const result = await writeTemplates(dir, {
      'link.txt': 'overwrite?',
      'dangling.txt': 'create through?',
    });
    expect(result.skipped).toEqual(['link.txt', 'dangling.txt']);
    expect(await readFile(outside, 'utf8')).toBe('secret');
    expect(await readlink(join(dir, 'dangling.txt'))).toBe(
      join(dir, 'missing.txt')
    );
    // リンクの先に新しくファイルを作ってもいない
    expect(await Bun.file(join(dir, 'missing.txt')).exists()).toBe(false);
  });

  test('空の雛形なら何もしない', async () => {
    expect(await writeTemplates(dir, {})).toEqual({
      created: [],
      skipped: [],
    });
  });

  test.skipIf(process.getuid?.() === 0)(
    '「既にある」以外の失敗はそのまま投げる',
    async () => {
      const locked = join(dir, 'locked');
      await mkdir(locked);
      await chmod(locked, 0o500);
      await expect(
        writeTemplates(locked, { 'x.txt': 'x' })
      ).rejects.toMatchObject({ code: 'EACCES' });
    }
  );
});
