/**
 * `init()` と `templates()` の単体の振る舞い。
 *
 * 依存を張って build まで通す確認は test/intent/init/init.test.ts が受け持つ。
 * ここでは依存を張らずに (install: false)、ディレクトリ名から package 名を
 * 決めること、雛形の中身、既存ファイルを上書きしないことを見る
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { init, templates } from '../../../src/core/init/index.ts';

const FILES = [
  'package.json',
  'tsconfig.json',
  '.gitignore',
  'app/hello/argv.tsx',
  'app/hello/cmd.tsx',
];

const roots: string[] = [];

/** 名前を指定した空のディレクトリを一時領域に作る */
async function emptyDir(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'decopin-init-'));
  roots.push(root);
  const dir = join(root, name);
  await mkdir(dir);
  return dir;
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe('templates', () => {
  test('5 つのファイルを返す', () => {
    expect(Object.keys(templates('demo'))).toEqual(FILES);
  });

  test('package.json は名前を bin にも使い、build / dev を持つ', () => {
    const pkg = JSON.parse(templates('demo')['package.json'] ?? '{}');
    expect(pkg.name).toBe('demo');
    expect(pkg.bin).toEqual({ demo: './dist/index.js' });
    expect(pkg.type).toBe('module');
    expect(pkg.scripts).toEqual({
      build: 'decopin build',
      dev: 'decopin dev --annotate',
    });
  });

  test('tsconfig は decopin-cli の JSX と生成された型を読む', () => {
    const tsconfig = JSON.parse(templates('demo')['tsconfig.json'] ?? '{}');
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
    expect(tsconfig.compilerOptions.jsxImportSource).toBe('decopin-cli/jsx');
    expect(tsconfig.compilerOptions.types).toEqual(['bun']);
    expect(tsconfig.include).toEqual(['app/**/*', '.decopin/types.d.ts']);
  });

  test('JSON と .gitignore は改行で終わる', () => {
    const files = templates('demo');
    for (const name of ['package.json', 'tsconfig.json', '.gitignore']) {
      expect(files[name]?.endsWith('\n')).toBe(true);
    }
    expect(files['.gitignore']).toBe('node_modules/\ndist/\n.decopin/\n');
  });

  test('hello コマンドは argv の宣言とコマンド本体の組', () => {
    const files = templates('demo');
    expect(files['app/hello/argv.tsx']).toContain('<Arg');
    expect(files['app/hello/argv.tsx']).toContain('default="world"');
    expect(files['app/hello/cmd.tsx']).toContain("CmdProps<'hello'>");
    expect(files['app/hello/cmd.tsx']).toContain('hello, {args.name}');
  });
});

describe('init', () => {
  test('空のディレクトリに雛形を書き、書いたものを返す', async () => {
    const dir = await emptyDir('hello-cli');
    const result = await init({ dir, install: false });
    expect(result).toEqual({
      dir,
      created: FILES,
      skipped: [],
      installed: false,
    });
    for (const file of FILES) {
      expect(await readFile(join(dir, file), 'utf8')).toBe(
        templates('hello-cli')[file] ?? ''
      );
    }
  });

  test('ディレクトリ名を package 名に使える形へ丸める', async () => {
    const cases: Array<[string, string]> = [
      ['My Tool', 'my-tool'],
      ['Foo@@Bar', 'foo-bar'],
      ['.hidden_', 'hidden'],
      ['v1.2_cli', 'v1.2_cli'],
    ];
    for (const [dirName, expected] of cases) {
      const dir = await emptyDir(dirName);
      await init({ dir, install: false });
      const pkg = await readJson(join(dir, 'package.json'));
      expect(pkg.name).toBe(expected);
      expect(pkg.bin).toEqual({ [expected]: './dist/index.js' });
    }
  });

  test('丸めて空になる名前は my-cli にする', async () => {
    const dir = await emptyDir('___');
    await init({ dir, install: false });
    expect((await readJson(join(dir, 'package.json'))).name).toBe('my-cli');
  });

  test('相対パスの dir は絶対パスにして返す', async () => {
    const dir = await emptyDir('rel');
    const relative = join(dir, '..', 'rel');
    const result = await init({ dir: relative, install: false });
    expect(result.dir).toBe(dir);
  });

  test('既にあるファイルは上書きせず skipped に入れる', async () => {
    const dir = await emptyDir('existing');
    await writeFile(join(dir, 'package.json'), '{"name":"mine"}\n');

    const result = await init({ dir, install: false });
    expect(result.skipped).toEqual(['package.json']);
    expect(result.created).toEqual(FILES.filter((f) => f !== 'package.json'));
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(
      '{"name":"mine"}\n'
    );
  });

  test('2 回目は何も書かない', async () => {
    const dir = await emptyDir('twice');
    await init({ dir, install: false });
    const again = await init({ dir, install: false });
    expect(again.created).toEqual([]);
    expect(again.skipped).toEqual(FILES);
  });
});
