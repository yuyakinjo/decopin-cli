#!/usr/bin/env bun
/**
 * src と test のフォルダ構成が揃っているかを調べる。
 *
 *   bun scripts/check-test-layout.ts
 *
 * ソースファイル (.ts / .tsx) を直に持つ src 配下のフォルダごとに、
 * test 側の同じ相対パスにフォルダがあり、その中にテストファイル
 * (*.test.ts / *.test.tsx) が 1 つ以上あることを求める。
 *
 *   src/cli/build/*.ts  →  test/cli/build/*.test.ts
 *
 * src 直下 (公開 API の入口) は対象外。欠けがあれば一覧を出して exit 1。
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const TEST = join(ROOT, 'test');

const SOURCE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;

/** dir 以下のフォルダを再帰で集める (dir 自身も含む) */
function directories(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return [
    dir,
    ...entries
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => directories(join(dir, entry.name))),
  ];
}

/** dir 直下のファイル名 (無ければ空) */
function files(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

type Problem = { path: string; reason: 'no-dir' | 'no-test' };

function check(): Problem[] {
  return directories(SRC)
    .filter((dir) => dir !== SRC)
    .filter((dir) => files(dir).some((name) => SOURCE.test(name)))
    .flatMap((dir): Problem[] => {
      const path = relative(SRC, dir);
      const testDir = join(TEST, path);
      if (!existsSync(testDir)) return [{ path, reason: 'no-dir' }];
      return files(testDir).some((name) => TEST_FILE.test(name))
        ? []
        : [{ path, reason: 'no-test' }];
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

const problems = check();

if (problems.length === 0) {
  console.log('✓ src と test の構成は揃っています');
  process.exit(0);
}

for (const { path, reason } of problems) {
  const detail =
    reason === 'no-dir' ? 'フォルダがありません' : 'テストファイルがありません';
  console.error(`✗ test/${path}  (${detail}, 対応: src/${path})`);
}
console.error(`\n${problems.length} 件のフォルダが揃っていません`);
process.exit(1);
