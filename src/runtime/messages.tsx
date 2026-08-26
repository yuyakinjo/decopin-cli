/**
 * フレームワーク自身が出すメッセージ。
 * Phase 4 で `error.tsx` / `global-error.tsx` に置き換わるまでの既定表示。
 */
import { Line, Stderr, Text } from '../components/index.ts';
import type { Renderable } from '../jsx/types.ts';

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
