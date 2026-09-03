/**
 * フレームワーク自身が出すメッセージ。
 * `error.tsx` / `global-error.tsx` がない場合や、表示に失敗した場合の既定表示。
 */
import { Line, Stderr, Text } from '../../../components/index.ts';
import type { Renderable } from '../../../jsx/types.ts';

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
