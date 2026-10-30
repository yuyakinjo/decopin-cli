/**
 * `decopin gen` の結合テスト。
 *
 * 不正な入力は 2 つに分けてある。**引数の形が成立しない**のと**置けない場所を
 * 指している**のは、結末 (exit 2・何も作らない) は同じでも直す場所が cmd.ts と
 * generate.ts で別なため。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GENERATOR_KINDS } from '../../src/cli/gen/generate.ts';
import { init } from '../../src/core/init/index.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'src/cli/bin.ts');
let project: string;

async function run(args: string[]) {
  const proc = Bun.spawn(['bun', ...args], {
    cwd: project,
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
const gen = (...args: string[]) => run([BIN, 'gen', ...args]);

beforeAll(async () => {
  project = await mkdtemp(join(tmpdir(), 'decopin-gen-'));
  await init({ dir: project, install: false });
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

describe('知っている規約の雛形を指定の場所に置き、それだけで build と型検査が通る', () => {
  test('全カテゴリの雛形を生成し、build・実行・型検査が通る', async () => {
    // 種類ごとに別のファイルを書くので独立している。**まとめて起こす** —
    // 1 つずつ await すると子プロセスの起動がそのまま積み上がる
    const written = Object.entries(GENERATOR_KINDS).flatMap(([kind, names]) => {
      const path =
        kind === 'root-only'
          ? 'app'
          : kind === 'inherited'
            ? 'app/group'
            : 'app/group/generated';
      return names.map(async (name) => ({
        name,
        path,
        result: await gen(`--${kind}`, name, '--path', path),
      }));
    });
    for (const { name, path, result } of await Promise.all(written)) {
      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(`Wrote ${path}/${name}.tsx`);
    }
    const build = await run([BIN, 'build']);
    expect(build.stderr).toBe('');
    expect(build.code).toBe(0);
    const command = await run(['dist/index.js', 'group', 'generated']);
    expect(command.code).toBe(0);
    expect(command.stdout).toBe('Hello, world!\n');
    const json = await run(['dist/index.js', 'group', 'generated', '--json']);
    expect(json.code).toBe(0);
    expect(JSON.parse(json.stdout)).toEqual({});
    const types = await run([
      join(REPO, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
    ]);
    expect(types.stdout).toBe('');
    expect(types.stderr).toBe('');
    expect(types.code).toBe(0);
  }, 60_000);

  test('custom app と省略した path を扱う', async () => {
    const result = await gen('--root-only', 'env', '--app', 'custom');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Wrote custom/env.tsx');
  });
});

describe('同じ規約のファイルが既にあれば書かず、残したものとして報告する', () => {
  test('既存の .tsx・.ts・旧 command を保持する', async () => {
    for (const file of ['cmd.tsx', 'cmd.ts', 'command.ts']) {
      const path = `app/keep-${file.replace('.', '-')}`;
      await mkdir(join(project, path), { recursive: true });
      await Bun.write(join(project, path, file), '// user content\n');
      const result = await gen('--conv', 'cmd', '--path', path);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(`Kept ${path}/${file}`);
      expect(await Bun.file(join(project, path, file)).text()).toBe(
        '// user content\n'
      );
      expect(await readdir(join(project, path))).toEqual([file]);
    }
  });
});

describe('種類の指定が無い・重複する・値が欠けるときは、ファイルを作らず usage を出して exit 2', () => {
  test('引数の形が成立しなければ何も作らない', async () => {
    const before = await readdir(join(project, 'app'));
    for (const args of [
      [],
      ['--conv'],
      ['--conv', 'unknown'],
      ['--inherited', 'cmd'],
      ['--conv', 'cmd', '--inherited', 'layout'],
      ['--conv', 'cmd', '--conv', 'argv'],
      ['--conv', 'cmd', '--wat', 'x'],
      ['--conv', 'cmd', '--path'],
    ]) {
      const result = await gen(...args);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain('Usage: decopin gen');
    }
    expect(await readdir(join(project, 'app'))).toEqual(before);
  });
});

describe('app の外・_private・root-only の位置違いには作らず、理由を出して exit 2', () => {
  test('ルーターが走査しない場所には作らない', async () => {
    const before = await readdir(join(project, 'app'));
    for (const args of [
      ['--root-only', 'env', '--path', 'app/invalid'],
      ['--conv', 'cmd', '--path', 'outside'],
      ['--conv', 'cmd', '--path', 'app/../outside'],
      ['--conv', 'cmd', '--path', 'app/_private'],
    ]) {
      const result = await gen(...args);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain('Usage: decopin gen');
    }
    expect(await readdir(join(project, 'app'))).toEqual(before);
  });
});

describe('配置先・途中のディレクトリ・app ルートのいずれかがリンクなら作らない', () => {
  test('配置先・途中のディレクトリ・app ルートのリンクを拒否する', async () => {
    const outside = join(project, 'outside');
    const inside = join(project, 'app/real');
    await mkdir(outside);
    await mkdir(inside);
    await symlink(outside, join(project, 'app/linked'), 'dir');
    await symlink(inside, join(project, 'app/internal-link'), 'dir');
    await symlink(
      join(project, 'missing'),
      join(project, 'app/dangling'),
      'dir'
    );
    await symlink(outside, join(project, 'linked-app'), 'dir');

    for (const args of [
      ['--conv', 'cmd', '--path', 'app/linked'],
      ['--conv', 'cmd', '--path', 'app/linked/new/nested'],
      ['--inherited', 'layout', '--path', 'app/internal-link'],
      ['--conv', 'cmd', '--path', 'app/dangling/new'],
      ['--root-only', 'env', '--app', 'linked-app'],
      ['--conv', 'cmd', '--app', 'linked-app', '--path', 'linked-app/new'],
    ]) {
      const result = await gen(...args);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain('symbolic link:');
      expect(result.stdout).toBe('');
    }
    expect(await readdir(outside)).toEqual([]);
    expect(await readdir(inside)).toEqual([]);
    expect(await readdir(project)).not.toContain('missing');
  });
});

describe('--help が生成できる種類の一覧と使用例を出す', () => {
  test('help は種類と使用例を表示する', async () => {
    const result = await gen('--help');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('--inherited:');
    expect(result.stdout).toContain(
      'bunx decopin-cli gen --conv cmd --path app/hello'
    );
  });
});
