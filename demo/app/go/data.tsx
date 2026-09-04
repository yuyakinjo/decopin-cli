import type { CmdProps } from 'decopin-cli';

/** 行き先の表。cwd からの相対パス */
const PLACES = {
  root: '.',
  app: 'app',
  docs: 'docs',
  tests: 'test',
} as const;

export default function Data({ args }: CmdProps<'go'>) {
  return { place: args.place, path: PLACES[args.place] };
}
