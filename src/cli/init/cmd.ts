import { join, relative } from 'node:path';

import { init, installDependencies } from '../../core/init/index.ts';
import { EXIT_CODE } from '../../core/runtime/exit.ts';
import { hasFlag, positionals, type Usage } from '../argv.ts';

export const usage: Usage = {
  args: '[dir]',
  summary:
    'create package.json, tsconfig.json and app/hello, then add\n' +
    'decopin-cli and @types/bun (skip with --no-install)',
};

export default async function run(argv: string[]): Promise<number> {
  const [dir] = positionals(argv);
  // 書いたものを先に見せてから依存を入れる。bun add の出力に埋もれないように
  const result = await init({ dir, install: false });
  const here = process.cwd();
  const rel = relative(here, result.dir);
  const where = rel === '' ? '.' : rel.startsWith('..') ? result.dir : rel;
  for (const path of result.created) {
    process.stdout.write(`Wrote ${join(where, path)}\n`);
  }
  for (const path of result.skipped) {
    process.stdout.write(`Kept ${join(where, path)} (already exists)\n`);
  }
  if (result.created.length === 0) {
    process.stdout.write('Nothing to do: every file already exists\n');
  }

  const skipInstall = hasFlag(argv, '--no-install');
  const installed = skipInstall ? false : await installDependencies(result.dir);
  if (!skipInstall && !installed) {
    process.stderr.write(
      '[decopin] bun add failed; add the dependencies by hand\n'
    );
  }

  const steps = [
    ...(where === '.' ? [] : [`cd ${where}`]),
    ...(installed ? [] : ['bun add decopin-cli', 'bun add -d @types/bun']),
    'bun run build',
    './dist/index.js hello',
  ];
  process.stdout.write(
    `\nNext:\n${steps.map((step) => `  ${step}`).join('\n')}\n`
  );
  return installed || skipInstall ? EXIT_CODE.success : EXIT_CODE.runtime;
}
