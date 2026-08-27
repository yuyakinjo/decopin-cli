import { Danger, Line, List, Text, type NotFoundProps } from 'decopin-cli';

/** 未知のコマンドの表示を差し替える (test/contract/routing.test.tsx) */
export default function NotFound({
  requested,
  suggestion,
  commands,
  program,
}: NotFoundProps) {
  return (
    <>
      <Danger>no such command: {requested}</Danger>
      {suggestion === undefined ? (
        <>
          <Line>
            <Text dim>available commands:</Text>
          </Line>
          <List items={commands} />
        </>
      ) : (
        <Line>
          {'  '}
          did you mean{' '}
          <Text bold color="cyan">
            {program} {suggestion}
          </Text>
          ?
        </Line>
      )}
    </>
  );
}
