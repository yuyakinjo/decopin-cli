/**
 * `decopin init` の完了条件: 空のディレクトリから `bun run build` を通して
 * `dist/index.js hello` が "hello, world" を出す。
 *
 * 雛形の中身を文字列で照合しても「動くこと」は担保できないので、
 * 実際に依存を張って build し、生成物を別プロセスで実行して確かめる。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { init } from '../../src/core/init/index.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'src/cli/bin.ts');

let project: string;

async function run(cmd: string[], cwd: string) {
  const proc = Bun.spawn(cmd, {
    cwd,
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

beforeAll(async () => {
  project = await mkdtemp(join(tmpdir(), 'decopin-init-'));
  const result = await init({ dir: project, install: false });
  expect(result.created.sort()).toEqual([
    '.gitignore',
    'app/hello/argv.tsx',
    'app/hello/cmd.tsx',
    'package.json',
    'tsconfig.json',
  ]);
  // `bun add decopin-cli` の代わりに、このリポジトリを node_modules に張る
  await mkdir(join(project, 'node_modules/@types'), { recursive: true });
  await symlink(REPO, join(project, 'node_modules/decopin-cli'), 'dir');
  await symlink(
    join(REPO, 'node_modules/@types/bun'),
    join(project, 'node_modules/@types/bun'),
    'dir'
  );
});

afterAll(async () => {
  await rm(project, { recursive: true, force: true });
});

describe('decopin init', () => {
  test('既にあるファイルは上書きしない', async () => {
    const before = await Bun.file(join(project, 'package.json')).text();
    const again = await init({ dir: project, install: false });
    expect(again.created).toEqual([]);
    expect(again.skipped).toHaveLength(5);
    expect(await Bun.file(join(project, 'package.json')).text()).toBe(before);
  });

  test('bun run build が警告なしに通る', async () => {
    const result = await run(['bun', BIN, 'build'], project);
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Found 1 command(s): hello');
    expect(await readdir(join(project, 'dist'))).toContain('index.js');
  }, 60_000);

  test('dist/index.js hello が挨拶する', async () => {
    const plain = await run(['bun', 'dist/index.js', 'hello'], project);
    expect(plain.code).toBe(0);
    expect(plain.stdout).toBe('hello, world\n');

    const named = await run(['bun', 'dist/index.js', 'hello', 'Bun'], project);
    expect(named.stdout).toBe('hello, Bun\n');
  });

  test('生成した tsconfig.json で型検査が通る', async () => {
    const result = await run(
      ['bunx', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
      project
    );
    expect(result.stdout).toBe('');
    expect(result.code).toBe(0);
  }, 60_000);
});
