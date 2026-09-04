/**
 * Phase 2 の完了条件: `demo/app/hello/cmd.tsx` が `dist/index.js hello` で動く。
 * 実際にビルドして、生成された 1 ファイルを別プロセスで実行して確かめる。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../src/core/build/index.ts';

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

/** ビルド済みの CLI を別プロセスで実行する */
async function cli(args: string[], input?: string) {
  const proc = Bun.spawn(['bun', outPath, ...args], {
    // input を渡さない場合は空の入力 (端末ではないので TTY 判定は false)
    stdin: new Blob([input ?? '']),
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
    expect(result.stdout).toBe('hello, test\n');
    expect(result.stderr).toBe('');
    expect(result.code).toBe(0);
  });

  test('サブコマンドの階層', async () => {
    const result = await cli(['user', 'list']);
    expect(result.stdout).toBe('USERS\nalice\nbob\n');
    expect(result.code).toBe(0);
  });

  test('未知のコマンドは app/not-found.tsx で表示され exit 2', async () => {
    const result = await cli(['helo']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('no such command: helo');
    expect(result.stderr).toContain('Did you mean');
    expect(result.code).toBe(2);
  });

  test('引数なしはコマンド一覧を stderr に出して exit 2', async () => {
    const result = await cli([]);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage: decopin-cli <command> [options]');
    expect(result.code).toBe(2);
  });

  test('グループは配下の一覧、--help なら stdout + exit 0', async () => {
    const implicit = await cli(['user']);
    expect(implicit.stdout).toBe('');
    expect(implicit.stderr).toContain('Usage: decopin-cli user <command>');
    expect(implicit.code).toBe(2);

    const explicit = await cli(['user', '--help']);
    expect(explicit.stderr).toBe('');
    expect(explicit.stdout).toContain('Usage: decopin-cli user <command>');
    // app/user/help.tsx の上書きが効く
    expect(explicit.stdout).toContain('users are read from');
    expect(explicit.code).toBe(0);
  });

  test('コマンド単位の help.tsx が生成された使い方に足せる', async () => {
    const result = await cli(['count', '--help']);
    expect(result.stdout).toContain('Stdin:');
    expect(result.stdout).toContain('Examples:');
    expect(result.stdout).toContain('| decopin-cli count');
    expect(result.code).toBe(0);
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

  test('繰り返し指定は配列になり、layout に包まれる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--tag', 'x']);
    expect(result.stdout).toBe('USERS\nalice\nfiltered by: x\n');
  });

  test('middleware は next の後で stderr に足せる', async () => {
    const result = await cli(['user', 'list', '-n', '1', '--verbose']);
    expect(result.stdout).toBe('USERS\nalice\n');
    expect(result.stderr).toMatch(/took \d+ms/);
    expect(result.code).toBe(0);
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

  test('上位ディレクトリの error.tsx を継承し、layout ごと stderr に出す', async () => {
    const result = await cli(['user', 'list', '-n', '0']);
    // 失敗したときに layout の見出しが stdout に出ると誤解を生む
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('USERS');
    expect(result.stderr).toContain('user: --limit:');
    expect(result.stderr).toContain('Try: user list --help');
    expect(result.code).toBe(2);
  });

  test('--help に stdin の宣言が出る', async () => {
    const result = await cli(['count', '--help']);
    expect(result.stdout).toContain('Stdin:');
    expect(result.stdout).toContain('required (pipe something in)');
    expect(result.code).toBe(0);
  });

  test('パイプした行を数える (mode="lines")', async () => {
    const result = await cli(['count'], 'a\nb\n\nc\n');
    expect(result.stdout).toBe('4\n');
    expect(result.code).toBe(0);
  });

  test('オプションと組み合わせられる', async () => {
    const result = await cli(['count', '--non-empty'], 'a\n\nb\n');
    expect(result.stdout).toBe('2\n');
  });

  test('boolean の alias を束ねられる (-nu)', async () => {
    const bundled = await cli(['count', '-nu'], 'a\n\na\nb\n');
    const separate = await cli(['count', '-n', '-u'], 'a\n\na\nb\n');
    expect(bundled.stdout).toBe('2\n');
    expect(bundled.stdout).toBe(separate.stdout);
    expect(bundled.code).toBe(0);
  });

  test('非配列オプションの重複は exit 2', async () => {
    const result = await cli(['hello', '-t', '1', '-t', '2']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('takes only one value');
    expect(result.code).toBe(2);
  });

  test('mode="text" の trim が効く', async () => {
    const result = await cli(['upper'], 'hello\n');
    expect(result.stdout).toBe('HELLO\n');
  });

  test('JSON の構造を宣言どおりに検証する', async () => {
    const result = await cli(
      ['user', 'import'],
      '[{"name":"alice","admin":true},{"name":"bob"}]'
    );
    expect(result.stdout).toBe('USERS\nalice (admin)\nbob\nimported 2\n');
    expect(result.code).toBe(0);
  });

  test('JSON が構造に合わなければ exit 2', async () => {
    const result = await cli(['user', 'import'], '[{"admin":true}]');
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('does not match the declared structure');
    expect(result.code).toBe(2);
  });

  test('壊れた JSON も exit 2', async () => {
    const result = await cli(['user', 'import'], 'not json');
    expect(result.stderr).toContain('stdin is not valid JSON');
    expect(result.code).toBe(2);
  });

  test('error.tsx が無いコマンドは global-error.tsx に落ちる', async () => {
    const result = await cli(['hello', '--times', '99']);
    expect(result.stderr).toContain('Invalid usage: --times:');
    expect(result.stderr).toContain('exit code 2');
    expect(result.code).toBe(2);
  });
});
