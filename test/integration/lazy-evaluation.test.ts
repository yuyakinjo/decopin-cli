/**
 * 単一ファイルで配っても、実行しないコマンドのモジュール本体は評価しない (ADR 12)。
 *
 * 生成コードに `() => import(` があることではなく、**副作用が起きないこと**で確かめる。
 * 別のコマンドを実行したときに、副作用を持つコマンドのマーカーが書かれなければよい
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../src/build/index.ts';

let workspace: string;
let workDir: string;
let outPath: string;
let marker: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'decopin-lazy-'));
  // 生成物は decopin-cli を解決できる場所 (リポジトリ内) に置く
  workDir = await mkdtemp(join(process.cwd(), '.decopin-lazy-'));
  marker = join(workspace, 'evaluated');
  const appDir = join(workspace, 'app');
  await mkdir(join(appDir, 'quiet'), { recursive: true });
  await mkdir(join(appDir, 'noisy'), { recursive: true });
  await writeFile(
    join(appDir, 'quiet', 'command.tsx'),
    "export default () => 'quiet';\n"
  );
  // モジュールを評価した時点で印を残す (トップレベルの副作用)
  await writeFile(
    join(appDir, 'noisy', 'command.tsx'),
    `await Bun.write(${JSON.stringify(marker)}, 'evaluated');\nexport default () => 'noisy';\n`
  );
  const result = await build({
    appDir,
    workDir,
    outDir: join(workspace, 'dist'),
    program: 'lazy',
  });
  outPath = result.outPath;
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
  await rm(workDir, { recursive: true, force: true });
});

async function runCli(args: string[]) {
  const proc = Bun.spawn(['bun', outPath, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
  return new Response(proc.stdout).text();
}

describe('実行しないコマンドは評価されない (ADR 12)', () => {
  test('quiet を実行しても noisy のモジュールは走らない', async () => {
    expect(await runCli(['quiet'])).toContain('quiet');
    expect(await Bun.file(marker).exists()).toBe(false);
  });

  test('noisy を実行すれば走る (テストが本物であることの確認)', async () => {
    expect(await runCli(['noisy'])).toContain('noisy');
    expect(await Bun.file(marker).exists()).toBe(true);
  });
});
