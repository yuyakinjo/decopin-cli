import { KeyValue, Line, List, Text, type CmdProps } from 'decopin-cli';

/** The view only formats what `data.tsx` produced (ADR 25) */
export default function Command({ data }: CmdProps<'stats'>) {
  return (
    <>
      <Line>
        <Text bold>files</Text>
      </Line>
      <List items={data.files} />
      <KeyValue data={{ shown: data.counted, total: data.total }} />
    </>
  );
}
