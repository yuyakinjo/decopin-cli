/**
 * フレームワーク自身が出すメッセージ。
 * `error.tsx` / `global-error.tsx` がない場合や、表示に失敗した場合の既定表示。
 */
import { Line, Stderr, Text } from '../../../core/components/index.ts';
import type { Renderable } from '../../../core/jsx/types.ts';
import { visibleControls } from '../../../core/text.ts';

/**
 * 組み込みの表示は、文面の制御文字を見える表記にしてから出す。
 *
 * 文面には入力や、利用者のコードが投げたエラーの中身が入る。どこで作られた
 * 文面でも最後はここを通るので、ここで 1 度だけ潰す。改行は残す
 * (複数行の文面は正当)
 */
export function ErrorMessage({
  message,
  hints = [],
}: {
  message: string;
  hints?: string[];
}): Renderable {
  return (
    <Stderr>
      <Line>
        <Text color="red">✖ </Text>
        {visibleControls(message)}
      </Line>
      {hints.map((hint) => (
        <Line key={hint}>
          <Text dim>{visibleControls(hint)}</Text>
        </Line>
      ))}
    </Stderr>
  );
}

/**
 * `DECOPIN_DEBUG=1` のときにエラー表示の後ろへ足す、cause の連鎖とスタック。
 * error.tsx の外側に付けるので、利用者の表示係には紛れ込まない
 */
export function ErrorTrace({ lines }: { lines: string[] }): Renderable {
  return (
    <Stderr>
      {lines.map((line, index) => (
        <Line key={`${index}:${line}`}>
          <Text dim>{visibleControls(line)}</Text>
        </Line>
      ))}
    </Stderr>
  );
}
