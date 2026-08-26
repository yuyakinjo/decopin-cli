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
  /** help に出す実行ファイル名。省略時は package.json の name */
  program?: string;
}

export interface BuildResult {
  routes: Route[];
  outPath: string;
  bytes: number;
}

/** help に出す名前は、既定でプロジェクトの package.json から取る */
async function readProgramName(): Promise<string> {
  try {
    const file = Bun.file('package.json');
    const json = (await file.json()) as { name?: unknown };
    return typeof json.name === 'string' ? json.name : 'cli';
  } catch {
    return 'cli';
  }
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const appDir = options.appDir ?? 'app';
  const workDir = options.workDir ?? '.decopin';
  const outDir = options.outDir ?? 'dist';

  const { routes } = await scan(appDir);
  if (routes.length === 0) {
    throw new Error(
      `No commands found in ${appDir}/. Create ${appDir}/<name>/command.tsx`
    );
  }

  const program = options.program ?? (await readProgramName());

  await mkdir(workDir, { recursive: true });
  await Bun.write(join(workDir, 'routes.ts'), generateRoutes(routes, workDir));
  const entry = join(workDir, 'entry.ts');
  await Bun.write(entry, generateEntry(program));

  const bundled = await bundle({
    entry,
    outDir,
    outFile: options.outFile,
    minify: options.minify,
  });

  return { routes, outPath: bundled.outPath, bytes: bundled.bytes };
}
