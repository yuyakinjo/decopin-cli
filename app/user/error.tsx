import { Line, Text, type ErrorProps } from 'decopin-cli';

/** `app/user/` 以下のコマンドが共有するエラー表示 (test/contract/routing.test.tsx の継承) */
export default function UserError({ error }: ErrorProps) {
  return (
    <>
      <Line>
        <Text color="red">user: </Text>
        {error.issues[0] ?? error.message}
      </Line>
      {error.kind === 'validation' ? (
        <Line>
          <Text dim>Try: user list --help</Text>
        </Line>
      ) : null}
    </>
  );
}
