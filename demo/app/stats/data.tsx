import type { CommandProps } from 'decopin-cli';

/**
 * Data only — no view here. `command.tsx` receives the return value as
 * `data`, and `--json` prints it directly (ADR 25).
 */
export default function Data({ options }: CommandProps<'stats'>) {
  const files = ['README.md', 'package.json', 'tsconfig.json'];
  const shown =
    options.limit === undefined ? files : files.slice(0, options.limit);
  return {
    counted: shown.length,
    total: files.length,
    files: shown,
  };
}
