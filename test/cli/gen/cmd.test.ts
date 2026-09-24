/**
 * `decopin gen` の argv 解釈と出力 (src/cli/gen/cmd.ts)。
 *
 * run() をプロセス内で呼び、標準出力・標準エラーへの書き込みを横取りして
 * 終了コードとの対応を見る。ファイルは一時ディレクトリにだけ書く
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import run, { help } from '../../../src/cli/gen/cmd.ts';
import { GENERATOR_KINDS } from '../../../src/cli/gen/generate.ts';
import { EXIT_CODE } from '../../../src/core/runtime/exit.ts';

let root: string;
let app: string;
let stdout: string[];
let stderr: string[];
let restore: (() => void)[];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'decopin-gen-cmd-'));
  app = join(root, 'app');
  stdout = [];
  stderr = [];
  const out = spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  const err = spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  restore = [() => out.mockRestore(), () => err.mockRestore()];
});
afterEach(async () => {
  for (const undo of restore) undo();
  await rm(root, { recursive: true, force: true });
});

describe('help', () => {
  test('-h / --help は help を出して 0。ファイルは作らない', async () => {
    for (const flag of ['-h', '--help']) {
      stdout = [];
      expect(await run(['gen', '--conv', 'cmd', '--app', app, flag])).toBe(
        EXIT_CODE.success
      );
      expect(stdout.join('')).toBe(help);
    }
    expect(await Bun.file(app).exists()).toBe(false);
  });

  test('help は種類ごとに選べる名前をすべて並べる', () => {
    for (const [kind, names] of Object.entries(GENERATOR_KINDS)) {
      expect(help).toContain(`  --${kind}: ${names.join(', ')}\n`);
    }
  });
});

describe('引数の形', () => {
  const cases: [string, string[], string][] = [
    ['未知のオプション', ['--name', 'x'], 'Unknown option: --name'],
    ['値の無いオプション', ['--conv'], 'Missing value for --conv'],
    ['値の代わりにフラグ', ['--conv', '--path'], 'Missing value for --conv'],
    [
      '同じオプションを 2 回',
      ['--conv', 'cmd', '--conv', 'argv'],
      'Duplicate option: --conv',
    ],
    [
      '種類を選んでいない',
      ['--path', 'app/x'],
      'Choose exactly one of --conv, --inherited or --root-only',
    ],
    [
      '種類を 2 つ選んだ',
      ['--conv', 'cmd', '--inherited', 'layout'],
      'Choose exactly one of --conv, --inherited or --root-only',
    ],
  ];
  for (const [label, args, message] of cases) {
    test(`${label}は usage error で、理由と help を stderr に出す`, async () => {
      expect(await run(['gen', ...args])).toBe(EXIT_CODE.usage);
      expect(stderr.join('')).toBe(`[decopin] ${message}\n\n${help}`);
      expect(stdout).toEqual([]);
    });
  }

  test('generate() が断った場合も usage error になる', async () => {
    const code = await run([
      'gen',
      '--root-only',
      'env',
      '--path',
      join(app, 'x'),
      '--app',
      app,
    ]);
    expect(code).toBe(EXIT_CODE.usage);
    expect(stderr.join('')).toStartWith(
      '[decopin] --root-only files must be placed at the app root\n\nUsage: decopin gen'
    );
  });
});

describe('使い方以外の失敗', () => {
  test('ファイルシステムの失敗は runtime error で、help は出さない', async () => {
    // 置き場所にディレクトリではなくファイルがある
    await mkdir(app, { recursive: true });
    await writeFile(join(app, 'hello'), 'not a directory\n');
    const code = await run([
      'gen',
      '--conv',
      'cmd',
      '--path',
      join(app, 'hello'),
      '--app',
      app,
    ]);
    expect(code).toBe(EXIT_CODE.runtime);
    const message = stderr.join('');
    expect(message).toStartWith('[decopin] ');
    expect(message).not.toContain('Usage: decopin gen');
  });
});

describe('書いた結果', () => {
  test('書いたファイルを cwd からの相対で Wrote と出して 0', async () => {
    const dir = join(app, 'hello');
    const code = await run([
      'gen',
      '--conv',
      'cmd',
      '--path',
      dir,
      '--app',
      app,
    ]);
    expect(code).toBe(EXIT_CODE.success);
    expect(stdout).toEqual([
      `Wrote ${relative(process.cwd(), join(dir, 'cmd.tsx'))}\n`,
    ]);
    expect(await readdir(dir)).toEqual(['cmd.tsx']);
  });

  test('既にあれば Kept と出し、それでも 0', async () => {
    const args = ['gen', '--root-only', 'env', '--app', app];
    await run(args);
    stdout = [];
    expect(await run(args)).toBe(EXIT_CODE.success);
    expect(stdout).toEqual([
      `Kept ${relative(process.cwd(), join(app, 'env.tsx'))} (already exists)\n`,
    ]);
  });
});
