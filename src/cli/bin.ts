#!/usr/bin/env bun
/**
 * decopin 自身の CLI。振り分けと help だけを持つ。
 *
 * 各コマンドは `cli/<command>/cmd.ts` に置く。利用者に課している
 * `app/<command>/cmd.tsx` と同じ形だが、JSX と argv.tsx は使わない (ADR 5)。
 * 実行時にディレクトリを走査もしない。表は静的な import で持つ
 */
import { EXIT_CODE } from '../core/runtime/exit.ts';
import type { Usage } from './argv.ts';
import buildCommand, { usage as buildUsage } from './build/cmd.ts';
import devCommand, { usage as devUsage } from './dev/cmd.ts';
import initCommand, { usage as initUsage } from './init/cmd.ts';

interface Command {
  usage: Usage;
  run: (argv: string[]) => Promise<number>;
}

/** 並び順が help の並び順 */
const COMMANDS: Record<string, Command> = {
  init: { usage: initUsage, run: initCommand },
  build: { usage: buildUsage, run: buildCommand },
  dev: { usage: devUsage, run: devCommand },
};

const INDENT = ' '.repeat(17);

function commandLines(): string {
  return Object.entries(COMMANDS)
    .map(([name, { usage }]) => {
      const head = [name, usage.args].filter(Boolean).join(' ');
      const [first, ...rest] = usage.summary.split('\n');
      return [
        `  ${head.padEnd(14)} ${first}`,
        ...rest.map((line) => `${INDENT}${line}`),
      ].join('\n');
    })
    .join('\n');
}

const USAGE = `Usage: decopin <command> [options]

Commands:
${commandLines()}

Options:
  --app <dir>    app directory (default: app)
  --out <dir>    output directory (default: dist)
  --work <dir>   where to put generated files (default: .decopin)
  --minify       minify the output
  --strict-effects
                 fail the build when the effects analysis gives up on a
                 command (eval, unresolved import). Opt a command out with
                 export const unsafeEval = true in its cmd.tsx
  -h, --help     show this help
`;

async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(USAGE);
    return EXIT_CODE.success;
  }

  const [name] = argv;
  const command = name === undefined ? undefined : COMMANDS[name];
  if (command !== undefined) return command.run(argv);

  process.stderr.write(`Unknown command: ${name}\n\n${USAGE}`);
  return EXIT_CODE.usage;
}

process.exit(await main(process.argv.slice(2)));
