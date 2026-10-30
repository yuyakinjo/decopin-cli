/**
 * `decopin build` の結合テスト。
 *
 * 生成された CLI が宣言どおりに動くかは runtime.test.ts が見る。ここは build
 * そのものの結末 (1 ファイルにまとまる・何を書いたか・どの副作用に届くか)。
 *
 * test/core/build/ と test/cli/build/ は scanner や codegen の内部を見る
 * 実装のテストで、ここと共存する。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../src/core/build/index.ts';

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

describe('出力は 1 ファイルで、shebang と実行権限が付いていてそのまま起動できる', () => {
  test('単一ファイルを生成し、shebang と実行権限を付ける', async () => {
    const code = await Bun.file(outPath).text();
    expect(code.startsWith('#!/usr/bin/env bun')).toBe(true);
    const stats = await stat(outPath);
    expect(stats.mode & 0o111).toBeGreaterThan(0);
  });
});

describe('app/ のディレクトリ構成がそのままコマンド名になり、入れ子は / で繋がる', () => {
  test('demo/app/ のコマンドを列挙する', async () => {
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

describe('cmd が 1 つも無ければ、どこに何を置けばよいかを言って止まる', () => {
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

describe('見つけたコマンドと、書いた生成物の場所を漏らさず出す', () => {
  test('コマンドの一覧と、書いた生成物の場所を出す', async () => {
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

describe('コマンドごとに、そこに置かれた規約ファイルと、上のディレクトリから効いている継承ファイルを、どこの階層のものかまで出す', () => {
  test('コマンドごとに、置かれたファイルと継承したファイルを出す', async () => {
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
    expect(result.stdout).toContain('¤  root-only    applies to every command');
    // ルート直下にしか置けないものは、コマンドの木とは別に 1 度だけ出す
    expect(result.stdout).toContain('Root (demo/app)');
    expect(result.stdout).toMatch(/Root \(demo\/app\)\n {4}.*¤ env\.tsx/);
  });

  test('全コマンドに効くものを全コマンドの行に書かない', async () => {
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

describe('コマンドごとに到達できる副作用と、そこまでの経路を出す。無ければ無いと言う', () => {
  test('副作用と、そこまでの経路を出す (ADR 32)', async () => {
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

  test('副作用に届かない app では、無いと言い切る', async () => {
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
