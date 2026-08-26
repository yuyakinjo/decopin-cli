import { Line, type CommandProps } from 'decopin-cli';

export default function Command({ stdin, options }: CommandProps<'count'>) {
  const lines = options['non-empty']
    ? stdin.filter((line) => line.trim() !== '')
    : stdin;
  return <Line>{lines.length}</Line>;
}
