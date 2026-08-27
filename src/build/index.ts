/** scan → evaluate → check → emit → bundle をつなぐ (§8) */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { bundle } from './bundler.ts';
import { checkTsConfig } from './checker.ts';
import type { Warning } from './checker.ts';
import { generateEntry, generateRoutes } from './codegen.ts';
import { evaluateEnv, evaluateRoutes } from './evaluator.ts';
import type { EvaluatedRoute } from './evaluator.ts';
import { inheritedChain, scan } from './scanner.ts';
import type { Route } from './scanner.ts';
import { generateTypes } from './type-emitter.ts';

export interface GenerateOptions {
  /** `app/` の位置 */
  appDir?: string;
  /** 生成物の置き場 */
  workDir?: string;
  /** help に出す実行ファイル名。省略時は package.json の name */
  program?: string;
}

export interface BuildOptions extends GenerateOptions {
  /** バンドルの出力先 */
  outDir?: string;
  outFile?: string;
  minify?: boolean;
}

export interface GenerateResult {
  routes: Route[];
  evaluated: EvaluatedRoute[];
  /** 落とすほどではないが、たぶん意図と違うこと */
  warnings: Warning[];
  /** 生成したファイル */
  files: { routes: string; entry: string; types: string };
}

export interface BuildResult extends GenerateResult {
  outPath: string;
  bytes: number;
}

/** help に出す名前は、既定でプロジェクトの package.json から取る */
async function readProgramName(): Promise<string> {
  try {
    const json = (await Bun.file('package.json').json()) as { name?: unknown };
    return typeof json.name === 'string' ? json.name : 'cli';
  } catch {
    return 'cli';
  }
}

/**
 * `.decopin/` を作る。バンドルはしないので `decopin dev` から何度でも呼べる。
 */
export async function generate(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const appDir = options.appDir ?? 'app';
  const workDir = options.workDir ?? '.decopin';

  const { routes, rootFiles, inherited, helpFiles } = await scan(appDir);
  if (routes.length === 0) {
    throw new Error(
      `No commands found in ${appDir}/. Create ${appDir}/<name>/command.tsx`
    );
  }

  // argv.tsx の誤りは 1 件目で止めず、全部まとめて報告する
  const { evaluated, problems } = await evaluateRoutes(routes);
  const env = await evaluateEnv(rootFiles.env);
  if (env.problem !== undefined) problems.push(env.problem);
  if (problems.length > 0) {
    const detail = problems
      .map((problem) => `  ${problem.file}: ${problem.message}`)
      .join('\n');
    throw new Error(`Invalid declarations:\n${detail}`);
  }

  const warnings = await checkTsConfig();
  const program = options.program ?? (await readProgramName());
  const files = {
    routes: join(workDir, 'routes.ts'),
    entry: join(workDir, 'entry.ts'),
    types: join(workDir, 'types.d.ts'),
  };

  // error.tsx / layout.tsx / middleware.tsx は上位ディレクトリから継承される
  const chain = (kind: 'error' | 'layout' | 'middleware') =>
    new Map<string, string[]>(
      routes.map((route) => {
        const files = inheritedChain(inherited, route.dir, kind);
        // error は近い順に試す。layout / middleware は外側から包む
        return [route.name, kind === 'error' ? files : [...files].reverse()];
      })
    );
  const errorChains = chain('error');
  const layoutChains = chain('layout');
  const middlewareChains = chain('middleware');

  await mkdir(workDir, { recursive: true });
  await Bun.write(
    files.routes,
    generateRoutes(
      {
        routes,
        errorChains,
        layoutChains,
        middlewareChains,
        helpFiles,
        globalError: rootFiles['global-error'],
        notFound: rootFiles['not-found'],
        env: rootFiles.env,
        version: rootFiles.version,
      },
      workDir
    )
  );
  await Bun.write(files.entry, generateEntry(program));
  await Bun.write(files.types, generateTypes(evaluated, env.spec));

  return { routes, evaluated, files, warnings };
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const generated = await generate(options);
  const bundled = await bundle({
    entry: generated.files.entry,
    outDir: options.outDir ?? 'dist',
    outFile: options.outFile,
    minify: options.minify,
  });
  return { ...generated, outPath: bundled.outPath, bytes: bundled.bytes };
}
