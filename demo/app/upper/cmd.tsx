import { Line, Text, type CmdProps } from 'decopin-cli';

export default function Command({ stdin }: CmdProps<'upper'>) {
  if (stdin === undefined) {
    return (
      <Line>
        <Text dim>nothing was piped in</Text>
      </Line>
    );
  }
  return <Line>{stdin.toUpperCase()}</Line>;
}
