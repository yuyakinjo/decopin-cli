import { Line, Text, type ErrorProps } from 'decopin-cli';

/** どの error.tsx でも捕まらなかったエラーの最後の受け皿 (§4.4) */
export default function GlobalError({ error, exitCode }: ErrorProps) {
  return (
    <>
      <Line>
        <Text bold color="red">
          {error.kind === 'validation' ? 'Invalid usage' : 'Unexpected error'}
        </Text>
        {': '}
        {error.issues[0] ?? error.message}
      </Line>
      {error.issues.slice(1).map((issue) => (
        <Line key={issue}>
          {'  '}
          <Text dim>{issue}</Text>
        </Line>
      ))}
      <Line>
        <Text dim>exit code {exitCode}</Text>
      </Line>
    </>
  );
}
