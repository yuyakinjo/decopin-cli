/**
 * Intent `add-conventions-without-memorizing` の Evidence。
 *
 * test/integration/gen.test.ts をここへ移して Behavior に結び直したもの。
 * 検証の中身は変えていない。
 *
 * 移す過程で 1 件割れた。元の「不正な引数や配置先はファイルを作らず usage error
 * を返す」は、**引数の形が成立しない**のと**置けない場所を指している**のを
 * 1 つのループに混ぜていた。結末 (exit 2・何も作らない) が同じなので 1 つの
 * テストで足りていたが、直す場所は cmd.ts と generate.ts で別なので分けた。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GENERATOR_KINDS } from '../../../src/cli/gen/generate.ts';
import { init } from '../../../src/core/init/index.ts';
import { toDocument, toReport } from '../core.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as GEN } from './implementation.ts';

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

describeBehavior(GEN, 'writes-known-conventions', () => {
  proves(
    '全カテゴリの雛形を生成し、build・実行・型検査が通る',
    async () => {
      for (const [kind, names] of Object.entries(GENERATOR_KINDS)) {
        const path =
          kind === 'root-only'
            ? 'app'
            : kind === 'inherited'
              ? 'app/group'
              : 'app/group/generated';
        for (const name of names) {
          const result = await gen(`--${kind}`, name, '--path', path);
          expect(result.code).toBe(0);
          expect(result.stderr).toBe('');
          expect(result.stdout).toContain(`Wrote ${path}/${name}.tsx`);
        }
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
    },
    60_000
  );

  proves('custom app と省略した path を扱う', async () => {
    const result = await gen('--root-only', 'env', '--app', 'custom');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Wrote custom/env.tsx');
  });
});

describeBehavior(GEN, 'keeps-existing-files', () => {
  proves('既存の .tsx・.ts・旧 command を保持する', async () => {
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

describeBehavior(GEN, 'rejects-bad-arguments', () => {
  proves('引数の形が成立しなければ何も作らない', async () => {
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

describeBehavior(GEN, 'refuses-outside-the-router', () => {
  proves('ルーターが走査しない場所には作らない', async () => {
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

describeBehavior(GEN, 'refuses-symbolic-links', () => {
  proves(
    '配置先・途中のディレクトリ・app ルートのリンクを拒否する',
    async () => {
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
    }
  );
});

describeBehavior(GEN, 'explains-what-can-be-generated', () => {
  proves('help は種類と使用例を表示する', async () => {
    const result = await gen('--help');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('--inherited:');
    expect(result.stdout).toContain(
      'bunx decopin-cli gen --conv cmd --path app/hello'
    );
  });
});

/** Graph そのものの検査。Behavior の証明ではないので proves() は使わない */
describe('Intent Graph', () => {
  test('Implementation が指すファイルが実在する', async () => {
    const missing: string[] = [];
    for (const carriers of Object.values(GEN.carriers)) {
      for (const carrier of carriers) {
        if (!(await Bun.file(join(REPO, carrier.where)).exists())) {
          missing.push(carrier.where);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ここまでの Evidence でドキュメントが組み立つ', () => {
    const doc = toDocument(toReport(GEN));
    expect(doc).toContain('Intent: add-conventions-without-memorizing');
    expect(doc).not.toContain('✗');
  });
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(GEN);
