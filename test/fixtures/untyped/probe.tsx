/**
 * 型がまだ生成されていない状態を再現するための当て木。
 * この tsconfig は .decopin/types.d.ts を読まないので Routes が空になる。
 */
import { Line, type CommandProps } from 'decopin-cli';

// 型が未生成なら、どんなコマンド名でも受け付ける (§4.8 のフォールバック)
export default function Command({
  args,
  options,
  cwd,
}: CommandProps<'not-generated-yet'>) {
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
