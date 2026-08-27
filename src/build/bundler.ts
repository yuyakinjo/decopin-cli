/** `bun build` で単一ファイルにまとめる (ADR 5 の bundle) */
import { chmod } from 'node:fs/promises';
import { join } from 'node:path';

export interface BundleOptions {
  entry: string;
  outDir: string;
  /** 出力ファイル名 */
  outFile?: string;
  minify?: boolean;
}

export interface BundleResult {
  outPath: string;
  bytes: number;
}

export async function bundle(options: BundleOptions): Promise<BundleResult> {
  const outFile = options.outFile ?? 'index.js';
  const built = await Bun.build({
    entrypoints: [options.entry],
    target: 'bun',
    minify: options.minify ?? false,
    banner: '#!/usr/bin/env bun',
  });

  if (!built.success) {
    const messages = built.logs.map((log) => String(log)).join('\n');
    throw new Error(`Bundling failed:\n${messages}`);
  }

  const artifact = built.outputs[0];
  if (artifact === undefined) {
    throw new Error('Bundling produced no output');
  }

  const outPath = join(options.outDir, outFile);
  const code = await artifact.text();
  await Bun.write(outPath, code);
  // 直接実行できるようにする (shebang と実行権限)
  await chmod(outPath, 0o755);

  return { outPath, bytes: Buffer.byteLength(code) };
}
