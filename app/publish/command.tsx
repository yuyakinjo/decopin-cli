import { Info, Success, type CommandProps } from 'decopin-cli';

export default function Command({ data }: CommandProps<'publish'>) {
  if (data.dryRun) return <Info>dry run: would publish, changed nothing</Info>;
  return <Success>published: {String(data.published)}</Success>;
}
