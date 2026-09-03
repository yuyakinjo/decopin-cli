/**
 * 未知のコマンドの表示。`app/not-found.tsx` で上書きできる。
 *
 * ルートが決まっていない時点の話なので `error.tsx` の連鎖は通らない。
 * 「どの error.tsx を使うべきか」もまだ決まっていないため。
 */
import { Line, Text } from '../../../components/index.ts';
import { DidYouMean } from '../../../components/patterns.tsx';
import type { Renderable } from '../../../jsx/types.ts';
import { present } from '../../../runtime/override.ts';
import type { Presentation } from '../../../runtime/override.ts';

/**
 * `not-found.tsx` が受け取る props。
 *
 * 未知のコマンドと、`notFound()` が呼ばれた場合の両方で使う (ADR 30)。
 * どちらかは `what` で見分ける
 */
export interface NotFoundProps {
  /**
   * 何を探していたか。未知のコマンドなら `'command'`、
   * `notFound({ what: 'user' })` なら `'user'`
   */
  what: string;
  /** 見つからなかった値 (コマンドなら空白区切りの名前) */
  requested: string;
  /** 編集距離が近い候補。無ければ undefined */
  suggestion: string | undefined;
  /** 選べる値 (昇順)。未知のコマンドなら登録コマンド名 */
  available: readonly string[];
  program: string;
  argv: readonly string[];
  cwd: string;
}

/** 利用者の not-found.tsx を試し、失敗時は組み込み表示へ戻す。 */
export function presentNotFound(
  loader: (() => Promise<unknown>) | undefined,
  props: NotFoundProps
): Promise<Presentation> {
  return present(loader, props, <NotFound {...props} />);
}

/** 組み込みの既定表示 */
export function NotFound({
  what,
  requested,
  suggestion,
  available,
}: NotFoundProps): Renderable {
  return (
    <>
      <Line>
        <Text color="red">✖ </Text>
        {/* コマンドは従来の言い回し、資源は Unix の慣用 (No such file) に寄せる */}
        {what === 'command'
          ? `Unknown command: ${requested}`
          : requested === ''
            ? `No such ${what}`
            : `No such ${what}: ${requested}`}
      </Line>
      <DidYouMean
        requested={requested}
        from={available}
        suggestion={suggestion}
        label={what === 'command' ? 'Available commands' : 'Available'}
      />
    </>
  );
}
