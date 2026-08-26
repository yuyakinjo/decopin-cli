import { Line, Text, type CommandProps } from 'decopin-cli';

export default function Command({ stdin }: CommandProps<'upper'>) {
  if (stdin === undefined) {
    return (
      <Line>
        <Text dim>nothing was piped in</Text>
      </Line>
    );
  }
  return <Line>{stdin.toUpperCase()}</Line>;
}
