/**
 * Phase 2 の完了条件: `app/hello/command.tsx` が `dist/index.js hello` で動く。
 * 実際にビルドして、生成された 1 ファイルを別プロセスで実行して確かめる。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../src/build/index.ts';

let workspace: string;
/**
 * 生成される entry.ts は `import { run } from 'decopin-cli'` を含む。
 * 利用者のプロジェクトでは decopin-cli が依存に入っているので解決できるが、
 * テストでも同じコードを検証したいので、生成物はリポジトリ内に置く。
 */
let workDir: string;
let outPath: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'decopin-build-'));
  workDir = await mkdtemp(join(process.cwd(), '.decopin-test-'));
  const result = await build({
    appDir: 'app',
    workDir,
    outDir: join(workspace, 'dist'),
  });
  outPath = result.outPath;
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
  await rm(workDir, { recursive: true, force: true });
});

/** ビルド済みの CLI を別プロセスで実行する */
async function cli(args: string[]) {
  const proc = Bun.spawn(['bun', outPath, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

describe('build', () => {
  test('単一ファイルを生成し、shebang と実行権限を付ける', async () => {
    const code = await Bun.file(outPath).text();
    expect(code.startsWith('#!/usr/bin/env bun')).toBe(true);
    const stats = await stat(outPath);
    expect(stats.mode & 0o111).toBeGreaterThan(0);
  });

  test('app/ のコマンドを列挙する', async () => {
    const result = await build({
      appDir: 'app',
      workDir,
      outDir: join(workspace, 'dist'),
    });
    expect(result.routes.map((route) => route.name)).toEqual([
      'crash',
      'hello',
      'user/list',
    ]);
  });

  test('コマンドが見つからなければ分かるエラーになる', async () => {
    await expect(
      build({
        appDir: 'test/fixtures/scan-app/no-command',
        workDir: join(workDir, 'empty'),
        outDir: join(workspace, 'dist-empty'),
      })
    ).rejects.toThrow(/No commands found/);
  });
});

describe('生成された CLI', () => {
  test('hello', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).toBe('hello, world\n');
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
  });

  test('サブコマンドの階層', async () => {
    const result = await cli(['user', 'list']);
    expect(result.stdout).toBe('alice\nbob\n');
    expect(result.code).toBe(0);
  });

  test('未知のコマンドは exit 2', async () => {
    const result = await cli(['helo']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: helo');
    expect(result.code).toBe(2);
  });

  test('パイプ経由では装飾を落とす', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).not.toContain('\x1b[');
  });

  test('argv.tsx の宣言どおりに引数とオプションを受け取る', async () => {
    const result = await cli(['hello', 'Alice', '--loud']);
    expect(result.stdout).toBe('HELLO, ALICE!\n');
    expect(result.code).toBe(0);
  });

  test('短縮形と既定値', async () => {
    const result = await cli(['hello', 'Bob', '-t', '2']);
    expect(result.stdout).toBe('hello, Bob\nhello, Bob\n');
  });

  test('繰り返し指定は配列になる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--tag', 'x']);
    expect(result.stdout).toBe('alice\nfiltered by: x\n');
  });

  test('--help は宣言から使い方を出して exit 0', async () => {
    const result = await cli(['hello', '--help']);
    expect(result.stdout).toContain('Usage: decopin-cli hello [name]');
    expect(result.stdout).toContain('-l, --loud');
    expect(result.stdout).toContain('-h, --help');
    expect(result.code).toBe(0);
  });

  test('検証に失敗すると exit 2 で stderr に理由が出る', async () => {
    const result = await cli(['hello', '--times', '9']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--times:');
    expect(result.code).toBe(2);
  });

  test('未知のオプションも exit 2', async () => {
    const result = await cli(['hello', '--nope']);
    expect(result.stderr).toContain('Unknown option: --nope');
    expect(result.code).toBe(2);
  });

  test('自分の error.tsx が使われ、<Exit> で終了コードを上書きできる', async () => {
    const result = await cli(['crash']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('crash: the command exploded\n');
    expect(result.code).toBe(42);
  });

  test('上位ディレクトリの error.tsx を継承する', async () => {
    const result = await cli(['user', 'list', '-n', '0']);
    expect(result.stderr).toContain('user: --limit:');
    expect(result.stderr).toContain('Try: user list --help');
    expect(result.code).toBe(2);
  });

  test('error.tsx が無いコマンドは global-error.tsx に落ちる', async () => {
    const result = await cli(['hello', '--times', '99']);
    expect(result.stderr).toContain('Invalid usage: --times:');
    expect(result.stderr).toContain('exit code 2');
    expect(result.code).toBe(2);
  });
});
