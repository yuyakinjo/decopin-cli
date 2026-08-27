import { Br, Line, Text, type HelpProps } from 'decopin-cli';

/** コマンド単位の上書き。生成された使い方に実例を足す */
export default function Help({ auto, program, command }: HelpProps) {
  return (
    <>
      {auto}
      <Br />
      <Line>
        <Text bold>Examples:</Text>
      </Line>
      <Line>{`  cat file.txt | ${program} ${command}`}</Line>
      <Line>{`  git status --porcelain | ${program} ${command} -n`}</Line>
    </>
  );
}
