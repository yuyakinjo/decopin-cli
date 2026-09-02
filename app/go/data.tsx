import type { CommandProps } from 'decopin-cli';

/** 行き先の表。cwd からの相対パス */
const PLACES = {
  root: '.',
  app: 'app',
  docs: 'docs',
  tests: 'test',
} as const;

export default function Data({ args }: CommandProps<'go'>) {
  return { place: args.place, path: PLACES[args.place] };
}
