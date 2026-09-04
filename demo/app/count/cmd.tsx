import { Line, type CmdProps } from 'decopin-cli';

export default function Command({ stdin, options }: CmdProps<'count'>) {
  const kept = options['non-empty']
    ? stdin.filter((line) => line.trim() !== '')
    : stdin;
  // boolean の alias は束ねられる (`-nu`)
  const lines = options.unique ? [...new Set(kept)] : kept;
  return <Line>{lines.length}</Line>;
}
