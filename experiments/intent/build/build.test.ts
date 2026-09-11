/**
 * Intent `ship-what-the-directories-declare` の Evidence。
 *
 * test/integration/build.test.ts の **前半 3 テスト**をここへ移して Behavior に
 * 結び直したもの。後半 22 テストは別の Intent (runtime/) に移した。
 *
 * 移す過程で 2 つ足した。src/cli/build/cmd.ts の出力 (何を書いたか・どの副作用に
 * 届くか) を誰も見ていなかったため — §11.6 Hidden Behavior。
 *
 * test/build/*.test.ts の 12 ファイルはここに持ってきていない。あれは
 * scanner や codegen の内部を見る実装のテストで、利用者が観測できる結末では
 * ないため (§11.4 を避ける)。**Evidence と普通のテストは共存する**。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../../src/core/build/index.ts';
import { toDocument, toReport } from '../core.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as BUILD } from './implementation.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'src/cli/bin.ts');

let workspace: string;
/**
 * 生成される entry.ts は `import { run } from 'decopin-cli'` を含む。
 * 利用者のプロジェクトでは依存に入っているので解決できるが、テストでも同じ
 * コードを検証したいので、生成物はリポジトリ内に置く。
 */
let workDir: string;
let outPath: string;

/** decopin build を CLI として実行する (出力そのものを見る Behavior 用) */
async function cli(args: string[]) {
  const proc = Bun.spawn(['bun', BIN, ...args], {
    cwd: REPO,
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
  workspace = await mkdtemp(join(tmpdir(), 'decopin-build-'));
  workDir = await mkdtemp(join(REPO, '.decopin-test-'));
  const result = await build({
    appDir: 'demo/app',
    workDir,
    outDir: join(workspace, 'dist'),
  });
  outPath = result.outPath;
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
  await rm(workDir, { recursive: true, force: true });
});

describeBehavior(BUILD, 'produces-one-runnable-file', () => {
  proves('単一ファイルを生成し、shebang と実行権限を付ける', async () => {
    const code = await Bun.file(outPath).text();
    expect(code.startsWith('#!/usr/bin/env bun')).toBe(true);
    const stats = await stat(outPath);
    expect(stats.mode & 0o111).toBeGreaterThan(0);
  });
});

describeBehavior(BUILD, 'names-commands-after-directories', () => {
  proves('demo/app/ のコマンドを列挙する', async () => {
    const result = await build({
      appDir: 'demo/app',
      workDir,
      outDir: join(workspace, 'dist'),
    });
    expect(result.routes.map((route) => route.name)).toEqual([
      'config',
      'count',
      'crash',
      'deploy',
      'go',
      'hello',
      'publish',
      'stats',
      'upper',
      'user/import',
      'user/list',
      'user/show',
    ]);
  });
});

describeBehavior(BUILD, 'refuses-an-app-without-commands', () => {
  proves('コマンドが見つからなければ分かるエラーになる', async () => {
    await expect(
      build({
        appDir: 'test/fixtures/scan-app/no-command',
        workDir: join(workDir, 'empty'),
        outDir: join(workspace, 'dist-empty'),
      })
    ).rejects.toThrow(/No commands found/);
  });
});

describeBehavior(BUILD, 'reports-what-it-wrote', () => {
  proves('コマンドの一覧と、書いた生成物の場所を出す', async () => {
    const result = await cli([
      'build',
      '--app',
      'demo/app',
      '--work',
      workDir,
      '--out',
      join(workspace, 'dist-cli'),
    ]);
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Found 12 command(s)');
    expect(result.stdout).toContain('user/show');
    // 書いたものは 3 種類とも出す。1 つでも黙ると次に何を見ればよいか分からない
    expect(result.stdout).toContain(`Wrote ${join(workDir, 'types.d.ts')}`);
    expect(result.stdout).toContain('(zsh completion)');
    expect(result.stdout).toMatch(/Wrote .*index\.js \([\d.]+ KB\) in \d+ms/);
  });
});

describeBehavior(BUILD, 'shows-what-each-command-is-made-of', () => {
  proves(
    'コマンドごとに、置かれたファイルと継承したファイルを出す',
    async () => {
      const result = await cli([
        'build',
        '--app',
        'demo/app',
        '--work',
        workDir,
        '--out',
        join(workspace, 'dist-tree'),
      ]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Route (demo/app)');
      // 自分のディレクトリのファイルは、読む順 (CONVENTION_FILES の順) で並ぶ
      expect(result.stdout).toMatch(
        /stats\n.*ƒ cmd\.tsx {2}ƒ argv\.tsx {2}ƒ data\.tsx {2}ƒ output\.tsx/
      );
      // 継承は ↑ を付けて、どの階層のものかまで出す。置かれたファイルと
      // 同じ行に並べ、どちらなのかは行ではなく記号で分ける
      expect(result.stdout).toMatch(
        /user\/list\n.*ƒ cmd\.tsx.*↑ user\/error\.tsx {2}↑ user\/layout\.tsx/
      );
      // 記号の読み方は木の下に置く
      expect(result.stdout).toContain(
        "ƒ  convention   placed in the command's own directory"
      );
      expect(result.stdout).toContain(
        '↑  inherited    comes from a directory above'
      );
      expect(result.stdout).toContain(
        '¤  root-only    applies to every command'
      );
      // ルート直下にしか置けないものは、コマンドの木とは別に 1 度だけ出す
      expect(result.stdout).toContain('Root (demo/app)');
      expect(result.stdout).toMatch(/Root \(demo\/app\)\n {4}.*¤ env\.tsx/);
    }
  );

  proves('全コマンドに効くものを全コマンドの行に書かない', async () => {
    const result = await cli([
      'build',
      '--app',
      'demo/app',
      '--work',
      workDir,
      '--out',
      join(workspace, 'dist-tree-root'),
    ]);
    // demo/app/not-found.tsx は Root の行にだけ出る
    const arrows = result.stdout
      .split('\n')
      .filter((line) => line.includes('↑') && line.includes('.tsx'));
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.some((line) => line.includes('not-found.tsx'))).toBe(false);
  });
});

describeBehavior(BUILD, 'reports-reachable-effects', () => {
  proves('副作用と、そこまでの経路を出す (ADR 32)', async () => {
    const result = await cli([
      'build',
      '--app',
      'demo/app',
      '--work',
      workDir,
      '--out',
      join(workspace, 'dist-effects'),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Effects reachable');
    // 経路まで出さないと「なぜ届くのか」が分からず直せない
    expect(result.stdout).toMatch(/ {2}publish: fs\.read/);
    expect(result.stdout).toMatch(/ {4}fs\.read: demo\/app\/publish\/\S+ -> /);
  });

  proves('副作用に届かない app では、無いと言い切る', async () => {
    const result = await cli([
      'build',
      '--app',
      'test/fixtures/hello-app',
      '--work',
      join(workDir, 'hello'),
      '--out',
      join(workspace, 'dist-hello'),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No effects reachable from any command');
  });
});

/** Graph そのものの検査。Behavior の証明ではないので proves() は使わない */
describe('Intent Graph', () => {
  test('Implementation が指すファイルが実在する', async () => {
    const missing: string[] = [];
    for (const carriers of Object.values(BUILD.carriers)) {
      for (const carrier of carriers) {
        if (!(await Bun.file(join(REPO, carrier.where)).exists())) {
          missing.push(carrier.where);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ここまでの Evidence でドキュメントが組み立つ', () => {
    const doc = toDocument(toReport(BUILD));
    expect(doc).toContain('Intent: ship-what-the-directories-declare');
    expect(doc).not.toContain('✗');
  });
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(BUILD);
