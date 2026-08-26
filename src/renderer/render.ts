import type { RenderInput } from '../jsx/types.ts';
import { serialize } from './ansi.ts';
import { resolveColorDepth } from './capabilities.ts';
import type { ColorDepth } from './color.ts';
/**
 * レンダリングの入口。(1) 評価 → (2) レイアウト → (3) 直列化 を通す (§6.1)。
 * 書き出し (4) は行わない。文字列を返すだけなのでテストしやすい。
 */
import { evaluate } from './evaluate.ts';
import { layout } from './layout.ts';

export interface RenderOptions {
  /** 色の表現力を明示指定する (省略時は §6.2 の判定を使う) */
  color?: { stdout?: ColorDepth; stderr?: ColorDepth };
  /** 判定に使う環境変数 (省略時は process.env) */
  env?: Record<string, string | undefined>;
  /** 判定に使う TTY 情報 (省略時は process.stdout / process.stderr) */
  isTTY?: { stdout?: boolean; stderr?: boolean };
  /** `--no-color` が渡されたか */
  noColorFlag?: boolean;
  /** 端末の桁数 (省略時は process.stdout.columns、無ければ 80) */
  columns?: number;
  /** UTF-8 の記号を使えるか (省略時は環境変数から判定) */
  unicode?: boolean;
}

export interface RenderResult {
  stdout: string;
  stderr: string;
  /** `<Exit>` で宣言された終了コード。宣言がなければ undefined */
  exitCode: number | undefined;
}

/**
 * 出力の末尾に改行を 1 つ保証する。
 * 「テキストの行は改行で終わる」という POSIX の慣習に合わせるためで、
 * これが無いとシェルのプロンプトが出力の末尾にくっつく。
 */
function endWithNewline(value: string): string {
  if (value === '' || value.endsWith('\n')) return value;
  return `${value}\n`;
}

/**
 * UTF-8 の記号を出してよいか。locale で判断する。
 * 判断できない場合は「出せる」側に倒す (今どきの端末はほぼ UTF-8)
 */
function supportsUnicode(env: Record<string, string | undefined>): boolean {
  const locale = env.LC_ALL ?? env.LC_CTYPE ?? env.LANG;
  if (locale === undefined) return true;
  return /utf-?8/i.test(locale);
}

export async function render(
  node: RenderInput,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const env = options.env ?? process.env;
  const tree = await evaluate(node);
  const { segments, exitCode } = layout(tree, {
    columns: options.columns ?? process.stdout.columns,
    unicode: options.unicode ?? supportsUnicode(env),
  });

  const depthFor = (
    fd: 'stdout' | 'stderr',
    explicit: ColorDepth | undefined
  ): ColorDepth => {
    if (explicit !== undefined) return explicit;
    const isTTY = options.isTTY?.[fd] ?? process[fd].isTTY === true;
    return resolveColorDepth({ isTTY, env, noColorFlag: options.noColorFlag });
  };

  const stdoutDepth = depthFor('stdout', options.color?.stdout);
  const stderrDepth = depthFor('stderr', options.color?.stderr);

  return {
    stdout: endWithNewline(
      serialize(
        segments.filter((segment) => segment.fd === 1),
        stdoutDepth
      )
    ),
    stderr: endWithNewline(
      serialize(
        segments.filter((segment) => segment.fd === 2),
        stderrDepth
      )
    ),
    exitCode,
  };
}
