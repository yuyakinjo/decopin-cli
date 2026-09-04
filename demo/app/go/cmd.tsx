import { Line, Text, type CmdProps } from 'decopin-cli';

export default function Command({ data }: CmdProps<'go'>) {
  return (
    <Line>
      <Text dim>cd</Text> {data.path}
    </Line>
  );
}
