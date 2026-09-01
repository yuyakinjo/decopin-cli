/**
 * ソースファイルに生の制御文字を入れない。
 *
 * ESC (U+001B) や NUL (U+0000) をリテラルのまま書くと、grep がファイルを
 * バイナリ扱いして検索から消え、エディタやフォーマッタの挙動も壊れる。
 * エスケープシーケンスを扱うコードは必ず '\u001b' のような表記で書く。
 * (PR #14 / #16 の作業中に実際に 3 回混入して気づいた)
 */
import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** 改行とタブ以外の C0 制御文字と DEL */
// oxlint-disable no-control-regex -- 制御文字の混入検査が本題
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
// oxlint-enable no-control-regex

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      files.push(...(await sourceFiles(path)));
      continue;
    }
    if (/\.(tsx?|md|json)$/.test(entry.name)) files.push(path);
  }
  return files;
}

describe('ソースの衛生', () => {
  test('生の制御文字 (ESC / NUL など) を含むファイルが無い', async () => {
    const offenders: string[] = [];
    for (const dir of ['src', 'test', 'app', 'scripts', 'docs']) {
      for (const file of await sourceFiles(dir)) {
        const text = await Bun.file(file).text();
        const match = CONTROL_CHARS.exec(text);
        if (match === null) continue;
        const code = (match[0].codePointAt(0) ?? 0)
          .toString(16)
          .padStart(4, '0');
        const line = text.slice(0, match.index).split('\n').length;
        offenders.push(`${file}:${line} (U+${code.toUpperCase()})`);
      }
    }
    // 落ちたら、その文字を '\u001b' のようなエスケープ表記に書き換える
    expect(offenders).toEqual([]);
  });
});
