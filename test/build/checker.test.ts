import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkTsConfig, stripJsonc } from '../../src/build/checker.ts';

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
