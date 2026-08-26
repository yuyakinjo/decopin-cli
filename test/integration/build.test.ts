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
    ).rejects.toThrow(/コマンドが見つかりません/);
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
    expect(result.stderr).toContain('未知のコマンド: helo');
    expect(result.code).toBe(2);
  });

  test('パイプ経由では装飾を落とす', async () => {
    const result = await cli(['hello']);
    expect(result.stdout).not.toContain('\x1b[');
  });
});
