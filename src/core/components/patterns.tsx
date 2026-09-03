/**
 * CLI で毎回書くことになる形の詰め合わせ (ADR 30)。
 *
 * 「型を用意したので自分で組んでください」ではなく、**よくある形が既に
 * 正しく用意されている**状態を目指す置き場。増えるたびにここへ足す。
 */
import { closest } from '../../features/conventions/cmd/router.ts';
import type { Renderable } from '../jsx/types.ts';
import { Line, Text } from './index.ts';

/** 打ち間違いの提案 */
export interface DidYouMeanProps {
  /** 打たれた値 */
  requested: string;
  /** 選べる値 */
  from: readonly string[];
  /**
   * 候補を計算済みなら渡す (再計算を避ける)。
   * 省略時は `from` から探す
   */
  suggestion?: string | undefined;
  /** 候補が無いときに一覧を出すか (既定 true) */
  showAvailable?: boolean;
  /** 一覧の見出し (既定 `'Available'`)。`'Available users'` のように渡す */
  label?: string;
}

/**
 * 「もしかして」の 1 行。候補が無ければ選べる値を並べる。
 *
 * ```tsx
 * <DidYouMean requested={args.name} from={knownUsers} />
 * ```
 */
export function DidYouMean({
  requested,
  from,
  suggestion,
  showAvailable = true,
  label = 'Available',
}: DidYouMeanProps): Renderable {
  const found =
    suggestion !== undefined
      ? suggestion
      : requested === ''
        ? undefined
        : closest(requested, from);

  if (found !== undefined) {
    return (
      <Line>
        <Text dim>Did you mean: </Text>
        <Text bold>{found}</Text>
        <Text dim>?</Text>
      </Line>
    );
  }
  if (!showAvailable || from.length === 0) return null;
  return (
    <Line>
      <Text dim>
        {label}: {from.join(', ')}
      </Text>
    </Line>
  );
}
