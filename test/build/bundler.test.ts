/** バンドルの失敗は、ログを添えて投げる (黙って空の出力を書かない) */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bundle } from '../../src/build/bundler.ts';

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'decopin-bundler-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('bundle', () => {
  test('構文の壊れた入口は Bundling failed で止まる', async () => {
    const entry = join(dir, 'broken.ts');
    await writeFile(entry, 'export const x = ;\n');
    await expect(bundle({ entry, outDir: dir })).rejects.toThrow(
      /Bundling failed/
    );
  });

  test('通れば shebang 付きの実行可能ファイルになる', async () => {
    const entry = join(dir, 'ok.ts');
    await writeFile(entry, 'console.log("ok");\n');
    const result = await bundle({ entry, outDir: dir, outFile: 'ok.js' });
    expect(
      (await Bun.file(result.outPath).text()).startsWith('#!/usr/bin/env bun')
    ).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
  });
});
