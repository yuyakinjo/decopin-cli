/** scan → check → emit → bundle をつなぐ (§8) */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { bundle } from './bundler.ts';
import { generateEntry, generateRoutes } from './codegen.ts';
import { scan } from './scanner.ts';
import type { Route } from './scanner.ts';

export interface BuildOptions {
  /** `app/` の位置 */
  appDir?: string;
  /** 生成物の置き場 */
  workDir?: string;
  /** バンドルの出力先 */
  outDir?: string;
  outFile?: string;
  minify?: boolean;
}

export interface BuildResult {
  routes: Route[];
  outPath: string;
  bytes: number;
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const appDir = options.appDir ?? 'app';
  const workDir = options.workDir ?? '.decopin';
  const outDir = options.outDir ?? 'dist';

  const { routes } = await scan(appDir);
  if (routes.length === 0) {
    throw new Error(
      `${appDir}/ にコマンドが見つかりません。app/<name>/command.tsx を作ってください`
    );
  }

  await mkdir(workDir, { recursive: true });
  await Bun.write(join(workDir, 'routes.ts'), generateRoutes(routes, workDir));
  const entry = join(workDir, 'entry.ts');
  await Bun.write(entry, generateEntry());

  const bundled = await bundle({
    entry,
    outDir,
    outFile: options.outFile,
    minify: options.minify,
  });

  return { routes, outPath: bundled.outPath, bytes: bundled.bytes };
}
