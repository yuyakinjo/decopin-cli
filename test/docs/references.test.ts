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
        // fixtures はテスト実行時に作るものがあるので対象外。
        // ここで見たいのは「挙動を説明しているテスト」への参照が切れていないか
        if (path.startsWith('test/fixtures/')) continue;
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

describe('宣言と実体の一致', () => {
  test('package.json が宣言する license のファイルが実在する', async () => {
    const manifest = (await Bun.file('package.json').json()) as {
      license?: string;
    };
    expect(manifest.license).toBe('MIT');
    const license = await Bun.file('LICENSE').text();
    expect(license).toContain('MIT License');
  });

  test('package.json の scripts が README に書いたとおり動く名前になっている', async () => {
    const manifest = (await Bun.file('package.json').json()) as {
      scripts?: Record<string, string>;
    };
    const readme = await Bun.file('README.md').text();
    const missing: string[] = [];
    for (const match of readme.matchAll(/^bun run ([\w:]+)$/gm)) {
      const name = match[1] as string;
      if (manifest.scripts?.[name] === undefined) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  test('サンプルの version が package.json と一致する', async () => {
    // app/ はこのリポジトリ自身のデモなので、古い版が残ると利用者が真似る
    const manifest = (await Bun.file('package.json').json()) as {
      version: string;
    };
    const sample = await Bun.file('app/version.tsx').text();
    expect(sample).toContain(`version="${manifest.version}"`);
  });

  test('CI が ci コマンドを回している', async () => {
    const workflow = await Bun.file('.github/workflows/ci.yml').text();
    expect(workflow).toContain('bun run ci');
    // ローカルと CI で同じものが走ることを担保する
    const manifest = (await Bun.file('package.json').json()) as {
      scripts?: Record<string, string>;
    };
    expect(manifest.scripts?.ci).toBeDefined();
  });
});
