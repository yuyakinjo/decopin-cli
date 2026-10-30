import { type CmdProps, Info, Success } from 'decopin-cli';

export default function Command({ data }: CmdProps<'publish'>) {
  if (data.dryRun) return <Info>dry run: would publish, changed nothing</Info>;
  return <Success>published: {String(data.published)}</Success>;
}
