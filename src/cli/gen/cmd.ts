import { join, relative } from 'node:path';

import { errorTag } from '../../core/errors.ts';
import { EXIT_CODE } from '../../core/runtime/exit.ts';
import type { Usage } from '../argv.ts';
import { generate, GENERATOR_KINDS, GenerateUsageError } from './generate.ts';

export const usage: Usage = {
  summary: 'generate a convention, inherited or root-only file',
};

export const help = `Usage: decopin gen <--conv name | --inherited name | --root-only name> [options]

${Object.entries(GENERATOR_KINDS)
  .map(([kind, names]) => `  --${kind}: ${names.join(', ')}`)
  .join('\n')}

Options:
  --path <dir>  destination directory, relative to cwd (default: app root)
  --app <dir>   app root (default: app)
  -h, --help    show this help

Examples:
  bunx decopin-cli gen --conv cmd --path app/hello
  bunx decopin-cli gen --inherited layout --path app/user
  bunx decopin-cli gen --root-only env --path app

Existing files are kept. Root-only files must be placed at the app root.
`;

export default async function run(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(help);
    return EXIT_CODE.success;
  }
  try {
    const values = new Map<string, string>();
    const allowed = ['--conv', '--inherited', '--root-only', '--path', '--app'];
    for (let i = 1; i < argv.length; i += 2) {
      const flag = argv[i]!;
      const value = argv[i + 1];
      if (!allowed.includes(flag))
        throw new GenerateUsageError(`Unknown option: ${flag}`);
      if (!value || value.startsWith('-'))
        throw new GenerateUsageError(`Missing value for ${flag}`);
      if (values.has(flag))
        throw new GenerateUsageError(`Duplicate option: ${flag}`);
      values.set(flag, value);
    }
    const kinds = (
      Object.keys(GENERATOR_KINDS) as (keyof typeof GENERATOR_KINDS)[]
    ).filter((kind) => values.has(`--${kind}`));
    if (kinds.length !== 1)
      throw new GenerateUsageError(
        'Choose exactly one of --conv, --inherited or --root-only'
      );
    const kind = kinds[0]!;
    const result = await generate({
      kind,
      name: values.get(`--${kind}`)!,
      path: values.get('--path'),
      app: values.get('--app'),
    });
    for (const file of result.created)
      process.stdout.write(
        `Wrote ${relative(process.cwd(), join(result.dir, file))}\n`
      );
    for (const file of result.skipped)
      process.stdout.write(
        `Kept ${relative(process.cwd(), join(result.dir, file))} (already exists)\n`
      );
    return EXIT_CODE.success;
  } catch (error) {
    process.stderr.write(
      `[decopin] ${Error.isError(error) ? error.message : String(error)}\n`
    );
    if (errorTag(error) === 'GenerateUsageError') {
      process.stderr.write(`\n${help}`);
      return EXIT_CODE.usage;
    }
    return EXIT_CODE.runtime;
  }
}
