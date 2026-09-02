#!/usr/bin/env bun
/**
 * decopin 自身の CLI。
 *
 * ここだけは argv の解析を手で書く。decopin の argv.tsx はビルドされた
 * CLI のためのもので、ビルドする側がそれに依存すると鶏と卵になるため (ADR 5)。
 */
import { relative } from 'node:path';

import { build } from '../build/index.ts';
import { watchApp } from '../build/watch.ts';
import { EXIT_CODE } from '../runtime/exit.ts';

const USAGE = `Usage: decopin <command> [options]

Commands:
  build          scan app/ and produce dist/index.js
  dev            watch app/ and keep .decopin/ (types included) up to date

Options:
  --app <dir>    app directory (default: app)
  --out <dir>    output directory (default: dist)
  --work <dir>   where to put generated files (default: .decopin)
  --minify       minify the output
  -h, --help     show this help
`;

function optionValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function runBuild(argv: string[]): Promise<number> {
  const started = performance.now();
  return build({
    appDir: optionValue(argv, '--app'),
    outDir: optionValue(argv, '--out'),
    workDir: optionValue(argv, '--work'),
    minify: argv.includes('--minify'),
  }).then((result) => {
    const elapsed = Math.round(performance.now() - started);
    for (const warning of result.warnings) {
      process.stderr.write(`[decopin] warning: ${warning.message}\n`);
      if (warning.hint !== undefined) {
        process.stderr.write(`[decopin]   ${warning.hint}\n`);
      }
    }
    const names = result.routes.map((route) => route.name || '(root)');
    // 副作用は「無いことの証明」が価値なので、あるものだけ挙げる (ADR 32)。
    // 見つけたものには入口からの経路を添える。「なぜ届くのか」が分からないと
    // 直せないので
    const here = process.cwd();
    const trail = (path: string[], end: string) =>
      [...path.map((file) => relative(here, file)), end].join(' -> ');
    const notable = [...result.effects].flatMap(([name, report]) => {
      const listed = Object.entries(report.effects)
        .filter(([, verdict]) => verdict !== 'none')
        .map(([category, verdict]) =>
          verdict === 'unknown' ? `${category}?` : category
        );
      if (listed.length === 0) return [];
      const routes = Object.keys(report.effects).flatMap((category) => {
        const site = report.sites.find((s) => s.category === category);
        return site === undefined
          ? []
          : [`    ${category}: ${trail(site.path, site.via)}`];
      });
      const gaveUp = report.escapes
        .slice(0, 1)
        .map((escape) => `    ?: ${trail(escape.path, escape.via)}`);
      return [
        `  ${name || '(root)'}: ${listed.join(', ')}`,
        ...routes,
        ...gaveUp,
      ];
    });
    const effectsBlock =
      notable.length === 0
        ? 'No effects reachable from any command\n'
        : `Effects reachable (? = analysis gave up):\n${notable.join('\n')}\n`;

    process.stdout.write(
      `Found ${result.routes.length} command(s): ${names.join(', ')}\n` +
        effectsBlock +
        `Wrote ${result.files.types}\n` +
        `Wrote ${result.completionPath} (zsh completion)\n` +
        `Wrote ${result.outPath} (${(result.bytes / 1024).toFixed(1)} KB) in ${elapsed}ms\n`
    );
    return EXIT_CODE.success;
  });
}

/** dev は Ctrl+C まで終わらないので、Promise は解決しない */
function runDev(argv: string[]): Promise<number> {
  return new Promise((resolvePromise) => {
    const watcher = watchApp({
      appDir: optionValue(argv, '--app'),
      workDir: optionValue(argv, '--work'),
      onGenerate: (result) => {
        for (const warning of result.warnings) {
          process.stderr.write(`[decopin] warning: ${warning.message}\n`);
        }
        const names = result.routes.map((route) => route.name || '(root)');
        process.stdout.write(
          `[decopin] ${result.routes.length} command(s): ${names.join(', ')}\n`
        );
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`[decopin] ${message}\n`);
      },
    });

    const stop = () => {
      watcher.close();
      resolvePromise(EXIT_CODE.success);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}

async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(USAGE);
    return EXIT_CODE.success;
  }

  const [command] = argv;
  if (command === 'build') return runBuild(argv);
  if (command === 'dev') return runDev(argv);

  process.stderr.write(`Unknown command: ${command}\n\n${USAGE}`);
  return EXIT_CODE.usage;
}

process.exit(await main(process.argv.slice(2)));
