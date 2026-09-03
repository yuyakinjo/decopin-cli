/**
 * エラー表示のフォールバック。
 *
 * 近い順に `error.tsx` を試し、最後に `global-error.tsx`、それも無ければ
 * 組み込みの既定表示。**表示係が自分で失敗しても、次の候補に進む** —
 * エラーを出そうとして落ちる、が一番困る事故なので。
 */
import type { Renderable, RenderInput } from '../../../core/jsx/types.ts';
import { CliError } from '../../conventions/error/errors.ts';
import type { ErrorProps } from '../../conventions/error/errors.ts';
import { ErrorMessage } from '../../conventions/error/messages.tsx';

export type ErrorHandlerLoader = () => Promise<unknown>;

export interface HandleErrorInput {
  error: CliError;
  /** 近い順の error.tsx → global-error.tsx */
  handlers: ErrorHandlerLoader[];
  argv: readonly string[];
  cwd: string;
  /**
   * 描画して書き出す。戻り値は `<Exit>` で宣言された終了コード。
   * `skipLayout` は表示係が `export const skipLayout = true` を持つ場合に真
   */
  emit: (node: RenderInput, skipLayout: boolean) => Promise<number | undefined>;
}

export interface HandledError {
  exitCode: number;
}

/** 組み込みの既定表示。ヒントには検証の残りの理由などを並べる */
function builtinView(error: CliError, extraHints: string[]): RenderInput {
  const issueHints = error.issues.length > 1 ? error.issues.slice(1) : [];
  const hints = [
    ...issueHints,
    // 直し方は理由より先に読ませる (ADR 31)
    ...error.hints,
    ...(error.kind === 'validation'
      ? ['Run with --help to see the usage']
      : []),
    ...extraHints,
  ];
  return (
    <ErrorMessage message={error.issues[0] ?? error.message} hints={hints} />
  );
}

export async function handleError({
  error,
  handlers,
  argv,
  cwd,
  emit,
}: HandleErrorInput): Promise<HandledError> {
  const failures: string[] = [];

  for (const loader of handlers) {
    try {
      const loaded = (await loader()) as {
        default?: unknown;
        skipLayout?: unknown;
      };
      const handler = loaded.default;
      if (typeof handler !== 'function') {
        failures.push('An error handler does not default-export a component');
        continue;
      }
      const props: ErrorProps = {
        error,
        exitCode: error.exitCode,
        argv,
        cwd,
      };
      // async な error.tsx も許すので、包む前に待つ
      const produced = (await (handler as (props: ErrorProps) => RenderInput)(
        props
      )) as Renderable;
      // stderr で包むのは呼び出し側 (layout の外側に付ける必要があるため)。
      // 表示係が <Stdout> を使えばそこだけ stdout に出せる
      const declared = await emit(produced, loaded.skipLayout === true);
      return { exitCode: declared ?? error.exitCode };
    } catch (handlerError) {
      const message =
        handlerError instanceof Error
          ? handlerError.message
          : String(handlerError);
      failures.push(`An error handler itself failed: ${message}`);
    }
  }

  // 組み込みの表示は layout に包まない (利用者の見た目に紛れ込ませない)
  const declared = await emit(builtinView(error, failures), true);
  return { exitCode: declared ?? error.exitCode };
}

/** 例外を CliError に揃える */
export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  return new CliError(error instanceof Error ? error.message : String(error), {
    cause: error,
  });
}
