/**
 * 型がまだ生成されていない状態を再現するための当て木。
 * この tsconfig は .decopin/types.d.ts を読まないので Routes が空になる。
 */
import { Line, type CmdProps } from 'decopin-cli';

// 型が未生成なら、どんなコマンド名でも受け付ける (ADR 9 のフォールバック)
export default function Command({
  args,
  options,
  cwd,
}: CmdProps<'not-generated-yet'>) {
  const name: unknown = args.name;
  const flag: unknown = options.flag;
  return (
    <Line>
      {String(name)}
      {String(flag)}
      {cwd}
    </Line>
  );
}
