/**
 * コード内の参照が切れていないことを担保する。
 *
 * 仕様書を持たない代わりに、コメントから ADR 番号と契約テストのパスを
 * 参照している。リネームや ADR の削除で参照が切れると、
 * 「どこに書いてあるか分からない」状態に逆戻りするのでここで検出する。
 */
import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DECISIONS = 'docs/decisions.md';
const ROOTS = ['src', 'app', 'scripts', 'test'];

/** 走査対象のソースを集める */
async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      files.push(...(await sourceFiles(path)));
      continue;
    }
    if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

const files: string[] = [];
for (const root of ROOTS) files.push(...(await sourceFiles(root)));

/** 検査する側は、自分の中に検出パターンを持っているので除く */
const SELF = 'test/docs/references.test.ts';

const sources = new Map<string, string>();
for (const file of files) {
  if (file === SELF) continue;
  sources.set(file, await Bun.file(file).text());
}

const decisions = await Bun.file(DECISIONS).text();

/** `## ADR 12: ...` の見出しから採番を読む */
const definedAdrs = new Set(
  [...decisions.matchAll(/^## ADR (\d+):/gm)].map((match) => match[1] as string)
);

describe('docs/decisions.md', () => {
  test('ADR が採番されている', () => {
    expect(definedAdrs.size).toBeGreaterThan(10);
  });

  test('ADR 番号が連番で重複していない', () => {
    const numbers = [...definedAdrs].map(Number).sort((a, b) => a - b);
    expect(numbers).toEqual(
      Array.from({ length: numbers.length }, (_, index) => index + 1)
    );
  });

  test('挙動の表を持ち込んでいない (契約はテストに置く方針)', () => {
    // 表を書くとまた実装とずれるので、決定と理由だけにする
    const tableRows = decisions
      .split('\n')
      .filter((line) => line.trim().startsWith('|'));
    // ADR 内の小さな対応表は許すが、仕様書のような大きな表は置かない
    expect(tableRows.length).toBeLessThan(40);
  });
});

describe('コードからの参照', () => {
  test('参照している ADR 番号がすべて実在する', () => {
    const dangling: string[] = [];
    for (const [file, source] of sources) {
      for (const match of source.matchAll(/\bADR (\d+)\b/g)) {
        const number = match[1] as string;
        if (!definedAdrs.has(number)) dangling.push(`ADR ${number} (${file})`);
      }
    }
    expect(dangling).toEqual([]);
  });

  test('参照しているテストファイルがすべて実在する', async () => {
    const missing: string[] = [];
    for (const [file, source] of sources) {
      for (const match of source.matchAll(/\btest\/[\w./-]+\.tsx?\b/g)) {
        const path = match[0];
        if (!(await Bun.file(path).exists())) missing.push(`${path} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('消したはずの仕様書を参照していない', () => {
    const stale: string[] = [];
    for (const [file, source] of sources) {
      if (source.includes('SPEC.md')) stale.push(file);
      // § 参照は ADR 番号と契約テストのパスに置き換えた
      if (/§\d/.test(source)) stale.push(`${file} (§ 参照)`);
    }
    expect(stale).toEqual([]);
  });
});

describe('README からの参照', () => {
  test('リンク先のファイルが実在する', async () => {
    const readme = await Bun.file('README.md').text();
    const missing: string[] = [];
    for (const match of readme.matchAll(/\]\((?!https?:)([^)#]+)\)/g)) {
      const path = (match[1] as string).replace(/\/$/, '');
      const exists =
        (await Bun.file(path).exists()) ||
        (await readdir(path).then(
          () => true,
          () => false
        ));
      if (!exists) missing.push(path);
    }
    expect(missing).toEqual([]);
  });
});
