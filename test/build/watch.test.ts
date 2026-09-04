/**
 * `decopin dev` は app/ の変化で build を回す (ADR 43)。
 * `.decopin/` の型だけでなく `dist/index.js` も保存のたびに追従する。
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { BuildResult } from '../../src/core/build/index.ts';
import { watchApp } from '../../src/core/build/watch.ts';
import type { WatchBackend, Watcher } from '../../src/core/build/watch.ts';

const NOOP = 'export default function Command() {\n  return null;\n}\n';

let watcher: Watcher | undefined;
let workspace: string | undefined;
/**
 * 生成される entry.ts は `import { run } from 'decopin-cli'` を含むので、
 * バンドルが通るようにこのリポジトリ配下に置く (test/contract/build.test.ts と同じ)
 */
let workDir: string | undefined;

afterEach(async () => {
  watcher?.close();
  watcher = undefined;
  if (workspace !== undefined)
    await rm(workspace, { recursive: true, force: true });
  workspace = undefined;
  if (workDir !== undefined)
    await rm(workDir, { recursive: true, force: true });
  workDir = undefined;
});

/** OS のファイル通知に依存せず、変更通知をテストから送る。 */
function manualWatch(): { backend: WatchBackend; change: () => void } {
  let onChange: (() => void) | undefined;
  return {
    backend: {
      watch: (_directory, listener) => {
        onChange = listener;
        return {
          close: () => {
            onChange = undefined;
          },
        };
      },
    },
    change: () => {
      if (onChange === undefined) throw new Error('watcher is not active');
      onChange();
    },
  };
}

/** 条件が満たされるまで短い間隔で待つ (watch は非同期なので) */
async function waitFor<T>(
  read: () => T | undefined,
  timeoutMs = 5000
): Promise<T> {
  const deadline = Temporal.Now.instant().add({ milliseconds: timeoutMs });
  while (Temporal.Instant.compare(Temporal.Now.instant(), deadline) < 0) {
    const value = read();
    if (value !== undefined) return value;
    await Bun.sleep(20);
  }
  throw new Error('timed out');
}

describe('watchApp', () => {
  test('起動時に一度 build し、app/ の変化で型とバンドルを作り直す', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'decopin-watch-'));
    workDir = await mkdtemp(join(process.cwd(), '.decopin-test-watch-'));
    const appDir = join(workspace, 'app');
    const outDir = join(workspace, 'dist');
    await mkdir(join(appDir, 'probe'), { recursive: true });
    await writeFile(join(appDir, 'probe/cmd.tsx'), NOOP);
    const results: BuildResult[] = [];
    const controlled = manualWatch();

    watcher = watchApp(
      {
        appDir,
        workDir,
        outDir,
        program: 'cli',
        debounceMs: 10,
        onGenerate: (result) => results.push(result),
      },
      controlled.backend
    );

    const first = await waitFor(() => results[0]);
    expect(first.routes.map((route) => route.name)).toEqual(['probe']);
    expect(await Bun.file(first.files.types).text()).toContain('"probe"');
    // バンドルまで済んでいる (bun run dev 中に ./dist/index.js を叩ける)
    expect(first.outPath).toBe(join(outDir, 'index.js'));
    expect(await Bun.file(first.outPath).exists()).toBe(true);

    // コマンドを増やすと、型にもバンドルにも増える
    const added = join(appDir, 'added');
    await mkdir(added, { recursive: true });
    await writeFile(join(added, 'cmd.tsx'), NOOP);
    controlled.change();

    const updated = await waitFor(() =>
      results.find((result) =>
        result.routes.some((route) => route.name === 'added')
      )
    );
    expect(updated.routes.map((route) => route.name).sort()).toEqual([
      'added',
      'probe',
    ]);
    expect(await Bun.file(updated.files.types).text()).toContain('"added"');
    expect(await Bun.file(updated.outPath).text()).toContain('added');
  }, 30_000);

  test('宣言の誤りは onError に渡し、watch は続ける', async () => {
    workspace = await mkdtemp(join(tmpdir(), 'decopin-watch-'));
    const errors: unknown[] = [];
    const results: BuildResult[] = [];
    const controlled = manualWatch();

    watcher = watchApp(
      {
        appDir: 'test/fixtures/eval-app',
        workDir: join(workspace, '.decopin'),
        outDir: join(workspace, 'dist'),
        program: 'cli',
        debounceMs: 10,
        onGenerate: (result) => results.push(result),
        onError: (error) => errors.push(error),
      },
      controlled.backend
    );

    const error = await waitFor(() => errors[0]);
    expect(String(error)).toContain('Invalid declarations');
    expect(String(error)).toContain('bad/argv.tsx');
    expect(results).toEqual([]);

    // 失敗後も監視を打ち切らず、次の変更を評価する。
    controlled.change();
    const nextError = await waitFor(() => errors[1]);
    expect(String(nextError)).toContain('Invalid declarations');
    expect(results).toEqual([]);
  }, 15_000);
});
