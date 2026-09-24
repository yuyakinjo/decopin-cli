/**
 * `decopin init` の出力の組み立て (src/cli/init/cmd.ts)。
 *
 * run() をプロセス内で呼び、書いたファイルの見せ方 (cwd からの相対か絶対か)、
 * 既存ファイルの扱い、次に打つコマンドの並びを見る。`--no-install` を渡すので
 * bun add は走らない。CLI から通した確認は test/intent/init/ の側にある
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import run from '../../../src/cli/init/cmd.ts';
import { templates } from '../../../src/core/init/index.ts';
import { EXIT_CODE } from '../../../src/core/runtime/exit.ts';

const FILES = Object.keys(templates('x'));

let root: string;
let home: string;
let stdout: string[];
let restore: (() => void)[];

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'decopin-init-cmd-')));
  home = process.cwd();
  stdout = [];
  const out = spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  restore = [() => out.mockRestore()];
});
afterEach(async () => {
  for (const undo of restore) undo();
  process.chdir(home);
  await rm(root, { recursive: true, force: true });
});

/** 依存を入れていないときの「次の一手」 */
function nextSteps(cd: string | undefined): string {
  const steps = [
    ...(cd === undefined ? [] : [`cd ${cd}`]),
    'bun add decopin-cli',
    'bun add -d @types/bun',
    'bun run build',
    './dist/index.js hello',
  ];
  return `\nNext:\n${steps.map((step) => `  ${step}`).join('\n')}\n`;
}

describe('init の出力', () => {
  test('cwd の下の dir なら相対パスで Wrote を出し、次の一手は cd から始まる', async () => {
    process.chdir(root);
    expect(await run(['init', 'my-cli', '--no-install'])).toBe(
      EXIT_CODE.success
    );
    expect(stdout).toEqual([
      ...FILES.map((file) => `Wrote ${join('my-cli', file)}\n`),
      nextSteps('my-cli'),
    ]);
  });

  test('dir を省くと cwd に書き、パスは . 起点・cd は出さない', async () => {
    const here = join(root, 'here');
    await mkdir(here);
    process.chdir(here);
    expect(await run(['init', '--no-install'])).toBe(EXIT_CODE.success);
    expect(stdout[0]).toBe(`Wrote ${FILES[0]}\n`);
    expect(stdout.at(-1)).toBe(nextSteps(undefined));
  });

  test('cwd の外の dir なら絶対パスで出す', async () => {
    const outside = join(root, 'outside');
    await mkdir(join(root, 'cwd'));
    process.chdir(join(root, 'cwd'));
    await run(['init', outside, '--no-install']);
    expect(stdout[0]).toBe(`Wrote ${join(outside, FILES[0]!)}\n`);
    expect(stdout.at(-1)).toBe(nextSteps(outside));
  });

  test('二度目は Kept と「何もしない」を出し、既存を書き換えない', async () => {
    process.chdir(root);
    await run(['init', 'again', '--no-install']);
    const before = await Bun.file(join(root, 'again/package.json')).text();
    stdout = [];
    expect(await run(['init', 'again', '--no-install'])).toBe(
      EXIT_CODE.success
    );
    expect(stdout).toEqual([
      ...FILES.map((file) => `Kept ${join('again', file)} (already exists)\n`),
      'Nothing to do: every file already exists\n',
      nextSteps('again'),
    ]);
    expect(await Bun.file(join(root, 'again/package.json')).text()).toBe(
      before
    );
  });
});
