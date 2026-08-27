/**
 * 未知のコマンドの表示。`app/not-found.tsx` で上書きできる。
 *
 * ルートが決まっていない時点の話なので `error.tsx` の連鎖は通らない。
 * 「どの error.tsx を使うべきか」もまだ決まっていないため。
 */
import { Line, Text } from '../components/index.ts';
import type { Renderable } from '../jsx/types.ts';

/** `not-found.tsx` が受け取る props */
export interface NotFoundProps {
  /** 入力されたコマンド名 (空白区切り) */
  requested: string;
  /** 編集距離が近いコマンド (空白区切り)。無ければ undefined */
  suggestion: string | undefined;
  /** 登録されているコマンド名 (空白区切り、昇順) */
  commands: readonly string[];
  program: string;
  argv: readonly string[];
  cwd: string;
}

/** 組み込みの既定表示 */
export function NotFound({
  requested,
  suggestion,
  commands,
}: NotFoundProps): Renderable {
  return (
    <>
      <Line>
        <Text color="red">✖ </Text>
        Unknown command: {requested}
      </Line>
      <Line>
        <Text dim>
          {suggestion === undefined
            ? `Available commands: ${commands.join(', ')}`
            : `Did you mean: ${suggestion}`}
        </Text>
      </Line>
    </>
  );
}
