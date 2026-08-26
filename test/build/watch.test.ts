import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { GenerateResult } from '../../src/build/index.ts';
import { watchApp } from '../../src/build/watch.ts';
import type { Watcher } from '../../src/build/watch.ts';

const APP = 'test/fixtures/watch-app';
const ADDED = join(APP, 'added');

let watcher: Watcher | undefined;
let workDir: string | undefined;

afterEach(async () => {
  watcher?.close();
  watcher = undefined;
  await rm(ADDED, { recursive: true, force: true });
  if (workDir !== undefined)
    await rm(workDir, { recursive: true, force: true });
  workDir = undefined;
});

/** 条件が満たされるまで短い間隔で待つ (watch は非同期なので) */
async function waitFor<T>(
  read: () => T | undefined,
  timeoutMs = 5000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await Bun.sleep(20);
  }
  throw new Error('timed out');
}

describe('watchApp', () => {
  test('起動時に一度生成し、app/ の変化で作り直す', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'decopin-watch-'));
    const results: GenerateResult[] = [];

    watcher = watchApp({
      appDir: APP,
      workDir,
      program: 'cli',
      debounceMs: 10,
      onGenerate: (result) => results.push(result),
    });

    const first = await waitFor(() => results[0]);
    expect(first.routes.map((route) => route.name)).toEqual(['probe']);
    expect(await Bun.file(first.files.types).text()).toContain('"probe"');

    // コマンドを増やすと、生成物にも増える
    await mkdir(ADDED, { recursive: true });
    await writeFile(
      join(ADDED, 'command.tsx'),
      'export default function Command() {\n  return null;\n}\n'
    );

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
  }, 15_000);

  test('宣言の誤りは onError に渡し、watch は続ける', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'decopin-watch-'));
    const errors: unknown[] = [];
    const results: GenerateResult[] = [];

    watcher = watchApp({
      appDir: 'test/fixtures/eval-app',
      workDir,
      program: 'cli',
      debounceMs: 10,
      onGenerate: (result) => results.push(result),
      onError: (error) => errors.push(error),
    });

    const error = await waitFor(() => errors[0]);
    expect(String(error)).toContain('Invalid declarations');
    expect(String(error)).toContain('bad/argv.tsx');
    expect(results).toEqual([]);
  }, 15_000);
});
