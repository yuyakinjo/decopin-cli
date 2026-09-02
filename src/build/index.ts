/** scan → evaluate → check → emit → bundle をつなぐ (ADR 5) */
import { mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { bundle } from './bundler.ts';
import {
  checkDeprecations,
  checkPurity,
  checkTsConfig,
  stdinSchemaWarnings,
} from './checker.ts';
import type { Warning } from './checker.ts';
import { generateEntry, generateRoutes } from './codegen.ts';
import {
  completionFileName,
  generateZshCompletion,
  resolveBinaryName,
} from './completions.ts';
import { acceptsUnknown, analyzeEffects } from './effects.ts';
import type { EffectReport } from './effects.ts';
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
  /**
   * 副作用の解析が諦めた (`unknown`) コマンドをビルドエラーにする (ADR 34)。
   * command.tsx が `export const unsafeEval = true` を持つコマンドは通す
   */
  strictEffects?: boolean;
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
  /** help と補完シムに出す実行ファイル名 (解決済み) */
  program: string;
  /** コマンド名 → 副作用の到達判定 (ADR 32) */
  effects: Map<string, EffectReport>;
}

export interface BuildResult extends GenerateResult {
  outPath: string;
  bytes: number;
  /** zsh 補完シム (ADR 21) の出力先 */
  completionPath: string;
}

/**
 * 中身が変わらないなら書かない。
 *
 * `.decopin/` は型検査が読むファイルなので、内容が同じなのに書き直すと
 * 読んでいる側 (tsc やエディタ) が途中の状態を見る余地が生まれる。
 * `decopin dev` の watch でも無駄な更新が減る
 */
async function writeIfChanged(path: string, content: string): Promise<void> {
  const file = Bun.file(path);
  if ((await file.exists()) && (await file.text()) === content) return;
  await Bun.write(path, content);
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

  const declarationFiles = [
    ...routes.flatMap((route) =>
      [route.files.argv, route.files.stdin].filter(
        (file): file is string => file !== undefined
      )
    ),
    ...(rootFiles.env === undefined ? [] : [rootFiles.env]),
  ];

  const warnings = await checkTsConfig();
  warnings.push(
    // 宣言ファイルが実行時の状態に依存していないか (test/contract/argv-parsing.test.ts)
    ...(await checkPurity(declarationFiles)),
    // 非推奨のものを使っていないか (ADR 20)
    ...(await checkDeprecations(declarationFiles))
  );
  const program = options.program ?? (await readProgramName());
  const files = {
    routes: join(workDir, 'routes.ts'),
    entry: join(workDir, 'entry.ts'),
    types: join(workDir, 'types.d.ts'),
  };

  // error.tsx / layout.tsx / middleware.tsx は上位ディレクトリから継承される
  const chain = (kind: 'error' | 'not-found' | 'layout' | 'middleware') =>
    new Map<string, string[]>(
      routes.map((route) => {
        const files = inheritedChain(inherited, route.dir, kind);
        // error は近い順に試す。layout / middleware は外側から包む
        const nearestFirst = kind === 'error' || kind === 'not-found';
        return [route.name, nearestFirst ? files : [...files].reverse()];
      })
    );
  const errorChains = chain('error');
  const notFoundChains = chain('not-found');
  const layoutChains = chain('layout');
  const middlewareChains = chain('middleware');

  // 副作用は「そのコマンドが読み込むもの全部」から数える (ADR 32)。
  // ファイルごとの解析は使い回すので、コマンドが増えても歩き直さない
  const cache = new Map();
  const effects = new Map<string, EffectReport>();
  for (const route of routes) {
    const entries = [
      ...Object.values(route.files),
      ...(errorChains.get(route.name) ?? []),
      ...(notFoundChains.get(route.name) ?? []),
      ...(layoutChains.get(route.name) ?? []),
      ...(middlewareChains.get(route.name) ?? []),
    ].filter((file): file is string => file !== undefined);
    effects.set(route.name, await analyzeEffects(entries, cache));
  }

  // strict: `none` を名乗れないコマンドを通さない (ADR 34)。何に当たったか
  // と、そこまでの経路を全部まとめて言う (1 件ずつ直して回さないように)
  if (options.strictEffects === true) {
    const refused: string[] = [];
    for (const route of routes) {
      const report = effects.get(route.name);
      if (report === undefined || report.escapes.length === 0) continue;
      if (await acceptsUnknown(route.files.command as string)) continue;
      const where = route.files.command as string;
      const reasons = report.escapes
        .map(
          (escape) =>
            `    ${escape.via}: ${escape.path.map((f) => relative(process.cwd(), f)).join(' -> ')}`
        )
        .join('\n');
      refused.push(
        `  ${route.name || '(root)'}: analysis gave up, so no effect can be ruled out\n${reasons}\n` +
          `    Fix the code above, or add \`export const unsafeEval = true\` to ${where} to accept unknown`
      );
    }
    if (refused.length > 0) {
      throw new Error(`Effects could not be verified:\n${refused.join('\n')}`);
    }
  }

  await mkdir(workDir, { recursive: true });
  await writeIfChanged(
    files.routes,
    generateRoutes(
      {
        routes,
        errorChains,
        notFoundChains,
        layoutChains,
        middlewareChains,
        helpFiles,
        globalError: rootFiles['global-error'],
        notFound: rootFiles['not-found'],
        env: rootFiles.env,
        version: rootFiles.version,
        effects: new Map(
          [...effects].map(([name, report]) => [name, report.effects])
        ),
      },
      workDir
    )
  );
  await writeIfChanged(files.entry, generateEntry(program));
  const types = generateTypes(evaluated, env.spec, workDir);
  for (const { file, nodes } of types.unsupported) {
    warnings.push(...stdinSchemaWarnings(file, nodes));
  }
  await writeIfChanged(files.types, types.text);

  return { routes, evaluated, files, warnings, program, effects };
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const generated = await generate(options);
  const outDir = options.outDir ?? 'dist';
  const bundled = await bundle({
    entry: generated.files.entry,
    outDir,
    outFile: options.outFile,
    minify: options.minify,
  });

  // 補完シムは構成に依存しないが、コマンド名は build 時に決まるのでここで書く。
  // 名前は help 用の program ではなく package.json の bin のキーから取る
  const bin = await resolveBinaryName(generated.program);
  const completionPath = join(outDir, 'completions', completionFileName(bin));
  await mkdir(join(outDir, 'completions'), { recursive: true });
  await writeIfChanged(completionPath, generateZshCompletion(bin));

  return {
    ...generated,
    outPath: bundled.outPath,
    bytes: bundled.bytes,
    completionPath,
  };
}
