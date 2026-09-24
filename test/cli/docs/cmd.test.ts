/**
 * `decopin docs` の書き先と報告 (src/cli/docs/cmd.ts)。
 *
 * run() をプロセス内で呼び、標準出力・標準エラーへの書き込みを横取りする。
 * 見るのは cmd.ts が決めること — `--out` の有無で書き先を変えること、
 * 書き先の親ディレクトリを作ること、失敗した例の数を stderr で言うこと
 * (走らせなかった例は失敗に数えない)。
 *
 * 生成される entry.ts が `import { run } from 'decopin-cli'` を含むので、
 * 作業場はリポジトリ配下に置く
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import run from '../../../src/cli/docs/cmd.ts';
import { EXIT_CODE } from '../../../src/core/runtime/exit.ts';

let root: string;
let shared: string[];
let stdout: string[];
let stderr: string[];
let restore: (() => void)[];

beforeAll(async () => {
  root = await mkdtemp(join(process.cwd(), '.decopin-test-docs-cmd-'));
  const appDir = join(root, 'app');
  await mkdir(join(appDir, 'boom'), { recursive: true });
  // 例を走らせると必ず失敗するコマンド
  await writeFile(
    join(appDir, 'boom/cmd.tsx'),
    "export default function Command() {\n  throw new Error('boom');\n}\n"
  );
  await writeFile(
    join(appDir, 'boom/example.tsx'),
    `import type { CommandExample } from 'decopin-cli';

export default function Example(): CommandExample[] {
  return [{ args: [], description: 'always fails' }];
}
`
  );
  shared = [
    '--app',
    appDir,
    '--work',
    join(root, 'work'),
    '--dist',
    join(root, 'dist'),
  ];
});
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

beforeEach(() => {
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
afterEach(() => {
  for (const undo of restore) undo();
});

describe('書き先', () => {
  test('--out が無ければ Markdown を標準出力にだけ出す', async () => {
    expect(await run(['docs', ...shared, '--no-run'])).toBe(EXIT_CODE.success);
    expect(stdout.join('')).toContain('## Commands');
    expect(stdout.join('')).toContain('_not run_');
    expect(stderr).toEqual([]);
  }, 60_000);

  test('--out があれば親ディレクトリを作って書き、標準出力は汚さない', async () => {
    await run(['docs', ...shared, '--no-run']);
    const printed = stdout.join('');
    stdout = [];

    const out = join(root, 'nested/deeper/commands.md');
    expect(await run(['docs', ...shared, '--no-run', '--out', out])).toBe(
      EXIT_CODE.success
    );
    expect(stdout).toEqual([]);
    expect(await Bun.file(out).text()).toBe(printed);
    // 走らせなかった例は失敗に数えない
    expect(stderr).toEqual([`[decopin] Wrote ${out} (1 command(s))\n`]);
  }, 60_000);
});

describe('失敗した例の報告', () => {
  test('例が失敗しても 0 で終わり、失敗の数を stderr で言う', async () => {
    const out = join(root, 'ran.md');
    expect(await run(['docs', ...shared, '--out', out])).toBe(
      EXIT_CODE.success
    );
    expect(stderr).toEqual([
      `[decopin] Wrote ${out} (1 command(s), 1 failing example(s))\n`,
    ]);
    expect(await Bun.file(out).text()).toContain('**failed (exit');
  }, 60_000);
});
