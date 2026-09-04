/**
 * フレームワーク自身が出すメッセージ。
 * `error.tsx` / `global-error.tsx` がない場合や、表示に失敗した場合の既定表示。
 */
import { Line, Stderr, Text } from '../../../core/components/index.ts';
import type { Renderable } from '../../../core/jsx/types.ts';

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
        {message}
      </Line>
      {hints.map((hint) => (
        <Line key={hint}>
          <Text dim>{hint}</Text>
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
          <Text dim>{line}</Text>
        </Line>
      ))}
    </Stderr>
  );
}
