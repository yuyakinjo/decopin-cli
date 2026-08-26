/**
 * エラー表示のフォールバック (§4.4)。
 *
 * 近い順に `error.tsx` を試し、最後に `global-error.tsx`、それも無ければ
 * 組み込みの既定表示。**表示係が自分で失敗しても、次の候補に進む** —
 * エラーを出そうとして落ちる、が一番困る事故なので。
 */
import { Stderr } from '../components/index.ts';
import type { Renderable, RenderInput } from '../jsx/types.ts';
import { CliError } from './errors.ts';
import type { ErrorProps } from './errors.ts';
import { ErrorMessage } from './messages.tsx';

export type ErrorHandlerLoader = () => Promise<unknown>;

export interface HandleErrorInput {
  error: CliError;
  /** 近い順の error.tsx → global-error.tsx */
  handlers: ErrorHandlerLoader[];
  argv: readonly string[];
  cwd: string;
  /** 描画して書き出す。戻り値は <Exit> で宣言された終了コード */
  emit: (node: RenderInput) => Promise<number | undefined>;
}

export interface HandledError {
  exitCode: number;
}

/** 組み込みの既定表示。ヒントには検証の残りの理由などを並べる */
function builtinView(error: CliError, extraHints: string[]): RenderInput {
  const issueHints = error.issues.length > 1 ? error.issues.slice(1) : [];
  const hints = [
    ...issueHints,
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
      const loaded = (await loader()) as { default?: unknown };
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
      // 既定の出力先は stderr。中で <Stdout> を使えば上書きできる
      const declared = await emit(<Stderr>{produced}</Stderr>);
      return { exitCode: declared ?? error.exitCode };
    } catch (handlerError) {
      const message =
        handlerError instanceof Error
          ? handlerError.message
          : String(handlerError);
      failures.push(`An error handler itself failed: ${message}`);
    }
  }

  const declared = await emit(builtinView(error, failures));
  return { exitCode: declared ?? error.exitCode };
}

/** 例外を CliError に揃える */
export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  return new CliError(error instanceof Error ? error.message : String(error), {
    cause: error,
  });
}
