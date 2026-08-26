import { Exit, Line, Text, type ErrorProps } from 'decopin-cli';

/** 自分のディレクトリの error.tsx が最優先 (§4.4) */
export default function CrashError({ error }: ErrorProps) {
  return (
    <>
      <Line>
        <Text bold color="magenta">
          crash:{' '}
        </Text>
        {error.message}
      </Line>
      {/* 終了コードは error.tsx から上書きできる */}
      <Exit code={42} />
    </>
  );
}
