import { Line, Text, type ErrorKind, type ErrorProps } from 'decopin-cli';

/** 使い方の誤り (exit 2) にあたる kind */
const USAGE_KINDS: ErrorKind[] = ['validation', 'stdin', 'env'];

/** 環境を整えれば直るもの。文言を変えて、直し方を目立たせる (ADR 31) */
const SETUP_KINDS: ErrorKind[] = ['auth', 'missing-tool'];

function headline(kind: ErrorKind): string {
  if (USAGE_KINDS.includes(kind)) return 'Invalid usage';
  if (SETUP_KINDS.includes(kind)) return 'Setup needed';
  return 'Unexpected error';
}

/** どの error.tsx でも捕まらなかったエラーの最後の受け皿 (test/contract/routing.test.tsx) */
export default function GlobalError({ error, exitCode }: ErrorProps) {
  return (
    <>
      <Line>
        <Text bold color="red">
          {headline(error.kind)}
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
      {/* 直し方は捨てない。独自の表示でも出す価値があるのはここ (ADR 31) */}
      {error.hints.map((hint) => (
        <Line key={hint}>
          {'  '}
          <Text color="cyan">{hint}</Text>
        </Line>
      ))}
      <Line>
        <Text dim>exit code {exitCode}</Text>
      </Line>
    </>
  );
}
