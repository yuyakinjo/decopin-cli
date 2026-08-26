#!/usr/bin/env bun
/**
 * decopin 自身の CLI。
 *
 * ここだけは argv の解析を手で書く。decopin の argv.tsx はビルドされた
 * CLI のためのもので、ビルドする側がそれに依存すると鶏と卵になるため (§8.1)。
 */
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
    minify: argv.includes('--minify'),
  }).then((result) => {
    const elapsed = Math.round(performance.now() - started);
    const names = result.routes.map((route) => route.name || '(root)');
    process.stdout.write(
      `Found ${result.routes.length} command(s): ${names.join(', ')}\n` +
        `Wrote ${result.files.types}\n` +
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
      onGenerate: (result) => {
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
