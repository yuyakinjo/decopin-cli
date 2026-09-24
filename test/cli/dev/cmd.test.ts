/**
 * `decopin dev` の argv の渡し方と報告 (src/cli/dev/cmd.ts)。
 *
 * run() をプロセス内で呼び、標準出力・標準エラーへの書き込みを横取りする。
 * 見るのは cmd.ts が決めること — フラグを watchApp へ渡すこと、生成のたびの
 * 報告の書式 (ルートコマンドは (root))、失敗は stderr に出して監視を続けること、
 * SIGINT/SIGTERM で閉じて 0 を返すこと。再生成の間引きや変更の拾い方は
 * test/intent/dev/ の側にある。
 *
 * 生成される entry.ts が `import { run } from 'decopin-cli'` を含むので、
 * 作業場はリポジトリ配下に置く
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import run from '../../../src/cli/dev/cmd.ts';
import { EXIT_CODE } from '../../../src/core/runtime/exit.ts';

const UNANNOTATED =
  'export default function Command(props) {\n  return null;\n}\n';

let root: string;
let appDir: string;
let args: string[];
let stdout: string[];
let stderr: string[];
let restore: (() => void)[];

beforeEach(async () => {
  root = await mkdtemp(join(process.cwd(), '.decopin-test-dev-cmd-'));
  appDir = join(root, 'app');
  await mkdir(join(appDir, 'probe'), { recursive: true });
  args = [
    'dev',
    '--app',
    appDir,
    '--work',
    join(root, 'work'),
    '--out',
    join(root, 'dist'),
  ];
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

/** 条件が満たされるまで短い間隔で待つ (生成は非同期なので) */
async function waitFor(ready: () => boolean, timeoutMs = 20_000) {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (ready()) return;
    await Bun.sleep(20);
  }
  throw new Error('timed out');
}

/**
 * run() を始め、`signal` を受けたときに run() が登録したリスナーだけを
 * 呼べるようにする。process.emit は使わない (他のリスナーまで起こすので)
 */
function start(argv: string[]) {
  const before = {
    SIGINT: process.listeners('SIGINT'),
    SIGTERM: process.listeners('SIGTERM'),
  };
  const done = run(argv);
  const added = (signal: 'SIGINT' | 'SIGTERM') =>
    process.listeners(signal).filter((l) => !before[signal].includes(l));
  const listeners = { SIGINT: added('SIGINT'), SIGTERM: added('SIGTERM') };
  return {
    done,
    listeners,
    stop: async (signal: 'SIGINT' | 'SIGTERM') => {
      for (const listener of listeners[signal]) listener(signal);
      const code = await done;
      for (const [name, list] of Object.entries(listeners)) {
        for (const listener of list) process.off(name, listener);
      }
      return code;
    },
  };
}

describe('生成の報告', () => {
  test('コマンドの数と名前 (ルートは (root))、書いた場所と大きさを出す', async () => {
    await writeFile(join(appDir, 'cmd.tsx'), UNANNOTATED);
    await writeFile(join(appDir, 'probe/cmd.tsx'), UNANNOTATED);
    const dev = start(args);
    await waitFor(() => stdout.join('').includes('[decopin] wrote'));
    expect(await dev.stop('SIGINT')).toBe(EXIT_CODE.success);

    const lines = stdout.join('').split('\n');
    expect(lines).toContain('[decopin] 2 command(s): (root), probe');
    const wrote = lines.find((line) => line.startsWith('[decopin] wrote'));
    expect(wrote).toMatch(
      /^\[decopin\] wrote .*types\.d\.ts and .*index\.js \(\d+\.\d KB\)$/
    );
    expect(stderr).toEqual([]);
  }, 30_000);

  test('--annotate を渡すと注釈を書き足し、書き足したファイルを報告する', async () => {
    const file = join(appDir, 'probe/cmd.tsx');
    await writeFile(file, UNANNOTATED);
    const dev = start([...args, '--annotate']);
    await waitFor(() => stdout.join('').includes('[decopin] wrote'));
    await dev.stop('SIGTERM');

    expect(await readFile(file, 'utf8')).toContain("CmdProps<'probe'>");
    const annotated = stdout.find((line) =>
      line.startsWith('[decopin] annotated ')
    );
    expect(annotated).toEndWith('cmd.tsx\n');
  }, 30_000);

  test('--annotate が無ければ cmd.tsx には触らない', async () => {
    const file = join(appDir, 'probe/cmd.tsx');
    await writeFile(file, UNANNOTATED);
    const dev = start(args);
    await waitFor(() => stdout.join('').includes('[decopin] wrote'));
    await dev.stop('SIGINT');

    expect(await readFile(file, 'utf8')).toBe(UNANNOTATED);
    expect(stdout.join('')).not.toContain('[decopin] annotated');
  }, 30_000);
});

describe('失敗と終了', () => {
  test('生成に失敗したら stderr に出し、シグナルを受けるまで終わらない', async () => {
    await writeFile(
      join(appDir, 'probe/cmd.tsx'),
      'export default function Command( {\n'
    );
    const dev = start(args);
    await waitFor(() => stderr.length > 0);
    expect(stderr[0]).toStartWith('[decopin] ');
    expect(stdout.join('')).not.toContain('[decopin] wrote');

    // 失敗しても解決していない (監視を続けている)
    const settled = await Promise.race([
      dev.done.then(() => true),
      Bun.sleep(100).then(() => false),
    ]);
    expect(settled).toBe(false);
    expect(await dev.stop('SIGINT')).toBe(EXIT_CODE.success);
  }, 30_000);

  test('SIGINT と SIGTERM の両方にリスナーを 1 つずつ登録する', async () => {
    await writeFile(join(appDir, 'probe/cmd.tsx'), UNANNOTATED);
    const dev = start(args);
    expect(dev.listeners.SIGINT).toHaveLength(1);
    expect(dev.listeners.SIGTERM).toHaveLength(1);
    await waitFor(() => stdout.length + stderr.length > 0);
    expect(await dev.stop('SIGTERM')).toBe(EXIT_CODE.success);
  }, 30_000);
});
