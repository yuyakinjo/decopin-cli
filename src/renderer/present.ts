/**
 * ストリーミング・ドキュメントの書き出し (ADR 22)。
 *
 * 静的な部分は上から順に到達した時点で flush し、`<Dynamic>` の島に当たったら
 * source が尽きるまで stderr の領域を描き換え、最後のフレームを残して続きを
 * 流す。島が 1 つも無ければ render + write と同じ 1 回書きになる (ADR 1)。
 *
 * 領域の描き換えは stderr が TTY のときだけ。パイプや CI では途中のフレームを
 * 描かず、最終フレームだけを 1 回書く (エスケープ列でログを汚さない)。
 */
import type { RenderInput } from '../jsx/types.ts';
import { serialize } from './ansi.ts';
import { evaluate } from './evaluate.ts';
import { layout } from './layout.ts';
import type { RenderNode } from './node.ts';
import { colorDepthFor, renderTree } from './render.ts';
import type { RenderOptions } from './render.ts';
import { displayWidth, terminalWidth } from './width.ts';
import { write } from './writer.ts';
import type { WritableLike, WriteTargets } from './writer.ts';

/** present() の設定。描画の設定に加えて書き出し先を差し替えられる */
export interface PresentOptions extends RenderOptions {
  /** 書き出し先 (テストから差し替えるため) */
  targets?: WriteTargets;
}

type DynamicNode = Extract<RenderNode, { kind: 'dynamic' }>;

/**
 * SIGWINCH と exit の購読。Bun の型定義はイベント名のオーバーロードが
 * 揃っていないので、文字列で扱う最小の形に絞る
 */
const events = process as unknown as {
  on(event: string, listener: () => void): void;
  once(event: string, listener: () => void): void;
  removeListener(event: string, listener: () => void): void;
};

type Chunk =
  | { kind: 'static'; nodes: RenderNode[] }
  | { kind: 'island'; node: DynamicNode };

/** ドキュメントを「静的チャンク」と「島」の並びに分ける */
function split(tree: RenderNode): Chunk[] {
  const top = tree.kind === 'group' ? tree.children : [tree];
  const chunks: Chunk[] = [];
  let current: RenderNode[] = [];
  for (const node of top) {
    if (node.kind === 'dynamic') {
      if (current.length > 0) chunks.push({ kind: 'static', nodes: current });
      current = [];
      chunks.push({ kind: 'island', node });
      continue;
    }
    current.push(node);
  }
  if (current.length > 0) chunks.push({ kind: 'static', nodes: current });
  return chunks;
}

const ESC = '\u001b';
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

/** CSI と OSC の列。幅の計測では落とす */
// oxlint-disable-next-line no-control-regex -- エスケープ列を落とすのが目的
const ESCAPES = /\u001b\[[0-9;?]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;

/**
 * フレームが端末で占める行数。折り返しを考慮する
 * (幅の計測は表示幅。String.length は日本語や絵文字でずれる)
 */
export function frameRows(text: string, columns: number): number {
  const lines = text.split('\n');
  // 末尾の改行が作る空要素は行にならない
  if (lines[lines.length - 1] === '') lines.pop();
  let rows = 0;
  for (const line of lines) {
    const width = displayWidth(line.replace(ESCAPES, ''));
    rows += Math.max(1, Math.ceil(width / columns));
  }
  return rows;
}

/** 前のフレームの領域を消して、カーソルを領域の先頭に戻す */
function eraseSequence(rows: number): string {
  if (rows === 0) return '';
  return `${ESC}[${rows}A\r${ESC}[0J`;
}

/** 島を駆動する。source が尽きるまで描き、最後のフレームを残す */
async function driveIsland(
  island: DynamicNode,
  options: PresentOptions
): Promise<void> {
  const err: WritableLike = options.targets?.stderr ?? process.stderr;
  const isTTY = options.isTTY?.stderr ?? process.stderr.isTTY === true;
  const depth = colorDepthFor('stderr', options);
  let columns = terminalWidth(
    options.columns ?? process.stderr.columns ?? process.stdout.columns
  );

  const frameText = async (value: unknown): Promise<string> => {
    const tree = await evaluate(island.frame(value));
    const { segments } = layout(tree, {
      columns,
      unicode: options.unicode,
    });
    // 島はまるごと stderr の領域なので、フレーム内の fd 指定は見ない
    const text = serialize(segments, depth);
    return text === '' || text.endsWith('\n') ? text : `${text}\n`;
  };

  let latest: { value: unknown } | undefined;
  let previousRows = 0;
  let painting = false;
  let tickError: unknown;

  const paint = async (value: unknown): Promise<void> => {
    const text = await frameText(value);
    err.write(`${eraseSequence(previousRows)}${text}`);
    previousRows = frameRows(text, columns);
  };

  /** interval とリサイズからの再描画。描画中なら次の機会に任せる */
  const repaint = (): void => {
    if (latest === undefined || painting) return;
    painting = true;
    paint(latest.value)
      .catch((error) => {
        tickError = error;
      })
      .finally(() => {
        painting = false;
      });
  };

  const onResize = (): void => {
    columns = terminalWidth(process.stderr.columns ?? process.stdout.columns);
    // 折り返しが変わると前の領域は正確に消せない。現フレームを描き直すに留める
    repaint();
  };

  const restoreCursor = (): void => {
    err.write(SHOW_CURSOR);
  };

  let timer: ReturnType<typeof setInterval> | undefined;
  try {
    if (isTTY) {
      err.write(HIDE_CURSOR);
      // 途中で殺されてもカーソルは返す
      events.once('exit', restoreCursor);
      events.on('SIGWINCH', onResize);
      if (island.interval !== undefined) {
        timer = setInterval(repaint, island.interval);
      }
    }

    for await (const value of island.source) {
      latest = { value };
      if (!isTTY) continue;
      // source からの値は取りこぼさず順に描く (interval の再描画とは重ねない)
      while (painting) await new Promise((resolve) => setTimeout(resolve, 1));
      painting = true;
      try {
        await paint(value);
      } finally {
        painting = false;
      }
    }
    if (tickError !== undefined) throw tickError;

    // 非 TTY は最終フレームだけを 1 回。TTY は最後に描いたものがそのまま残る
    if (!isTTY && latest !== undefined) {
      err.write(await frameText(latest.value));
    }
  } finally {
    if (timer !== undefined) clearInterval(timer);
    if (isTTY) {
      events.removeListener('SIGWINCH', onResize);
      events.removeListener('exit', restoreCursor);
      err.write(SHOW_CURSOR);
    }
  }
}

/**
 * JSX をドキュメントとして書き出す。静的な部分は到達した順に flush、
 * `<Dynamic>` は領域として駆動する (ADR 22)。
 *
 * @returns `<Exit>` で宣言された終了コード。宣言がなければ undefined
 */
export async function present(
  node: RenderInput,
  options: PresentOptions = {}
): Promise<number | undefined> {
  const tree = await evaluate(node);
  const chunks = split(tree);
  let exitCode: number | undefined;

  for (const chunk of chunks) {
    if (chunk.kind === 'island') {
      await driveIsland(chunk.node, options);
      continue;
    }
    const result = renderTree(
      { kind: 'group', children: chunk.nodes },
      options
    );
    write(result, options.targets);
    if (result.exitCode !== undefined) exitCode = result.exitCode;
  }
  return exitCode;
}
