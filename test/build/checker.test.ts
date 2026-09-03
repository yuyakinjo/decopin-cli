import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkPurity,
  checkTsConfig,
  stdinSchemaWarnings,
  stripJsonc,
} from '../../src/core/build/checker.ts';

const dirs: string[] = [];

async function tsconfig(content: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'decopin-check-'));
  dirs.push(dir);
  const path = join(dir, 'tsconfig.json');
  await Bun.write(path, JSON.stringify(content));
  return path;
}

afterAll(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

describe('checkTsConfig', () => {
  test('正しく設定されていれば警告なし', async () => {
    const path = await tsconfig({
      compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'decopin-cli/jsx' },
    });
    expect(await checkTsConfig(path)).toEqual([]);
  });

  test('このリポジトリの tsconfig.json は警告なし', async () => {
    expect(await checkTsConfig('tsconfig.json')).toEqual([]);
  });

  test('jsxImportSource が無ければ警告する', async () => {
    const path = await tsconfig({ compilerOptions: { jsx: 'react-jsx' } });
    const warnings = await checkTsConfig(path);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('jsxImportSource');
    // React を探しに行って失敗する、という分かりにくい事故を先に伝える
    expect(warnings[0]?.hint).toContain('react/jsx-runtime');
  });

  test('jsx も無ければ両方警告する', async () => {
    const path = await tsconfig({ compilerOptions: { strict: true } });
    expect(await checkTsConfig(path)).toHaveLength(2);
  });

  test('extends があれば継承を疑って黙る', async () => {
    const path = await tsconfig({ extends: './base.json' });
    expect(await checkTsConfig(path)).toEqual([]);
  });

  test('ファイルが無ければ置き方を伝える', async () => {
    const warnings = await checkTsConfig('/tmp/decopin-no-such-tsconfig.json');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.hint).toContain('jsxImportSource');
  });

  test('壊れた JSON も警告として扱う (ビルドは止めない)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'decopin-check-'));
    dirs.push(dir);
    const path = join(dir, 'tsconfig.json');
    await Bun.write(path, '{ broken');
    const warnings = await checkTsConfig(path);
    expect(warnings[0]?.message).toContain('could not be parsed');
  });
});

describe('stripJsonc', () => {
  test('行コメントを落とす', () => {
    expect(stripJsonc('{ "a": 1 // note\n}')).toBe('{ "a": 1 \n}');
  });

  test('ブロックコメントを落とす', () => {
    expect(stripJsonc('{ /* x */ "a": 1 }')).toBe('{  "a": 1 }');
  });

  test('文字列の中の // は消さない', () => {
    expect(stripJsonc('{ "url": "https://example.com" }')).toBe(
      '{ "url": "https://example.com" }'
    );
  });

  test('エスケープされた引用符に惑わされない', () => {
    const source = '{ "a": "say \\" // not a comment" }';
    expect(stripJsonc(source)).toBe(source);
  });

  test('末尾カンマを落とす', () => {
    expect(stripJsonc('{ "a": [1, 2,], }')).toBe(
      '{ "a": [1, 2], }'.replace(', }', ' }')
    );
  });

  test('コメント付きの実物をパースできる', () => {
    const source = `{
      // 設定
      "compilerOptions": {
        "jsx": "react-jsx", /* JSX */
        "jsxImportSource": "decopin-cli/jsx",
      },
    }`;
    expect(JSON.parse(stripJsonc(source))).toEqual({
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'decopin-cli/jsx',
      },
    });
  });
});

describe('checkPurity', () => {
  async function sourceFile(content: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'decopin-purity-'));
    dirs.push(dir);
    const path = join(dir, 'argv.tsx');
    await Bun.write(path, content);
    return path;
  }

  test('純粋な宣言は警告なし', async () => {
    const file = await sourceFile(
      'export default function Argv() { return null; }'
    );
    expect(await checkPurity([file])).toEqual([]);
  });

  test('process.env に依存していれば警告する', async () => {
    const file = await sourceFile(
      'const dev = process.env.NODE_ENV === "development";'
    );
    const warnings = await checkPurity([file]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('process.env');
    // ビルド時に評価して型を出すので、実行時の状態に依存すると型がずれる
    expect(warnings[0]?.hint).toContain('generated types');
  });

  test('現在時刻と乱数も警告する', async () => {
    const file = await sourceFile('const x = [Date.now(), Math.random()];');
    const labels = (await checkPurity([file])).map((w) => w.message);
    expect(labels.some((m) => m.includes('Date.now()'))).toBe(true);
    expect(labels.some((m) => m.includes('Math.random()'))).toBe(true);
  });

  test('Temporal.Now も現在時刻なので警告する', async () => {
    const file = await sourceFile(
      "const now = Temporal.Now.zonedDateTimeISO('UTC');"
    );
    const labels = (await checkPurity([file])).map((w) => w.message);
    expect(labels.some((m) => m.includes('Temporal.Now'))).toBe(true);
  });

  test('引数なしの new Date() を警告する (引数ありは見逃す)', async () => {
    const bad = await sourceFile('const now = new Date();');
    expect(await checkPurity([bad])).toHaveLength(1);
    const fine = await sourceFile('const fixed = new Date("2020-01-01");');
    expect(await checkPurity([fine])).toEqual([]);
  });

  test('読めないファイルは黙って飛ばす', async () => {
    expect(await checkPurity(['/tmp/decopin-no-such-declaration.tsx'])).toEqual(
      []
    );
  });
});

describe('stdinSchemaWarnings', () => {
  test('未対応ノードをファイル付きで伝える', () => {
    const warnings = stdinSchemaWarnings('app/x/stdin.tsx', [
      { path: '$.a', node: 'record' },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('app/x/stdin.tsx');
    expect(warnings[0]?.message).toContain('"record" at $.a');
    expect(warnings[0]?.hint).toContain('<Type.*>');
  });

  test('同じ種別はまとめる (大きなスキーマで溢れないように)', () => {
    const warnings = stdinSchemaWarnings('s.tsx', [
      { path: '$.a', node: 'record' },
      { path: '$.b', node: 'record' },
      { path: '$.c', node: 'tuple' },
    ]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]?.message).toContain('$.a, $.b');
  });
});
