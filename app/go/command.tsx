import { Line, Text, type CommandProps } from 'decopin-cli';

export default function Command({ data }: CommandProps<'go'>) {
  return (
    <Line>
      <Text dim>cd</Text> {data.path}
    </Line>
  );
}
