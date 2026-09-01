import type { RenderInput } from '../jsx/types.ts';
import { serialize } from './ansi.ts';
import { resolveColorDepth } from './capabilities.ts';
import type { ColorDepth } from './color.ts';
/**
 * レンダリングの入口。(1) 評価 → (2) レイアウト → (3) 直列化 を通す (ADR 1)。
 * 書き出し (4) は行わない。文字列を返すだけなのでテストしやすい。
 */
import { evaluate } from './evaluate.ts';
import { layout } from './layout.ts';
import type { RenderNode } from './node.ts';

/** 描画の設定。省略した項目は環境から判定する */
export interface RenderOptions {
  /** 色の表現力を明示指定する (省略時は capabilities.ts の判定を使う) */
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

/** fd ごとの文字列と、`<Exit>` で宣言された終了コード */
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

/** fd の色深度を決める。明示指定 > TTY と環境変数からの判定 */
export function colorDepthFor(
  fd: 'stdout' | 'stderr',
  options: RenderOptions
): ColorDepth {
  const explicit = options.color?.[fd];
  if (explicit !== undefined) return explicit;
  const env = options.env ?? process.env;
  const isTTY = options.isTTY?.[fd] ?? process[fd].isTTY === true;
  return resolveColorDepth({ isTTY, env, noColorFlag: options.noColorFlag });
}

/**
 * 評価済みの木を fd ごとの文字列にする。
 * present() が島の合間の静的チャンクを描くときにも使う (ADR 22)
 */
export function renderTree(
  tree: RenderNode,
  options: RenderOptions = {}
): RenderResult {
  const env = options.env ?? process.env;
  const { segments, exitCode } = layout(tree, {
    columns: options.columns ?? process.stdout.columns,
    unicode: options.unicode ?? supportsUnicode(env),
  });

  const stdoutDepth = colorDepthFor('stdout', options);
  const stderrDepth = colorDepthFor('stderr', options);

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

/**
 * JSX を fd ごとの文字列にする。書き出しは行わない (テストしやすくするため)。
 *
 * @param node コンポーネントの戻り値をそのまま渡せる (Promise でもよい)
 */
export async function render(
  node: RenderInput,
  options: RenderOptions = {}
): Promise<RenderResult> {
  return renderTree(await evaluate(node), options);
}
