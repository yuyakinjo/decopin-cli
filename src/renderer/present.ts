/**
 * ストリーミング・ドキュメントの書き出し (ADR 22)。
 *
 * トップレベルを**順に**評価し、静的な部分は到達した時点で flush、
 * `<Dynamic>` の島に当たったら source が尽きるまで stderr の領域を描き換え、
 * 最後のフレームを残して続きを評価する。島より後ろの async コンポーネントを
 * 先に待つと、source の中で解決される Promise とデッドロックするため、
 * 全体を一度に評価してはいけない。
 *
 * 領域の描き換えは stderr が TTY のときだけ。パイプや CI では途中のフレームを
 * 描かず、最終フレームだけを 1 回書く (エスケープ列でログを汚さない)。
 */
import { isElement, isHost } from '../jsx/types.ts';
import type { AnyComponent, Renderable, RenderInput } from '../jsx/types.ts';
import { serialize } from './ansi.ts';
import { RenderError } from './errors.ts';
import { evaluate } from './evaluate.ts';
import { layout } from './layout.ts';
import type { RenderNode } from './node.ts';
import { colorDepthFor, renderTree, supportsUnicode } from './render.ts';
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
 * exit とシグナルの購読。Bun の型定義はイベント名のオーバーロードが
 * 揃っていないので、文字列で扱う最小の形に絞る
 */
const events = process as unknown as {
  on(event: string, listener: () => void): void;
  once(event: string, listener: () => void): void;
  removeListener(event: string, listener: () => void): void;
  listenerCount(event: string): number;
};

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * トップレベルを順に評価する generator。
 * 島より後ろの兄弟は、島の駆動が終わって次を取り出すまで評価されない。
 * 関数コンポーネント (Fragment 含む) は呼んで戻り値へ潜り、
 * 組み込みノードに行き着いたところで evaluate() に渡して深く確定させる
 */
async function* documentNodes(node: RenderInput): AsyncGenerator<RenderNode> {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (isThenable(node)) {
    yield* documentNodes((await node) as Renderable);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) yield* documentNodes(child);
    return;
  }
  if (isElement(node) && !isHost(node.type)) {
    const result = await (node.type as AnyComponent)(node.props as never);
    yield* documentNodes(result);
    return;
  }
  const evaluated = await evaluate(node);
  if (evaluated.kind === 'group') {
    for (const child of evaluated.children) yield child;
    return;
  }
  yield evaluated;
}

const ESC = '\u001b';
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

/** カーソルを隠したまま殺されないように見張るシグナルと、慣習の終了コード (128 + 番号) */
const EXIT_SIGNALS: ReadonlyArray<readonly [string, number]> = [
  ['SIGHUP', 129],
  ['SIGINT', 130],
  ['SIGTERM', 143],
];

/** CSI と OSC の列。幅の計測では落とす */
// oxlint-disable no-control-regex -- エスケープ列を落とすのが目的
const ESCAPES =
  /\u001b\[[0-9;?]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;
// oxlint-enable no-control-regex

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
  const env = options.env ?? process.env;
  const unicode = options.unicode ?? supportsUnicode(env);
  const explicitColumns = options.columns !== undefined;
  let columns = terminalWidth(
    options.columns ?? process.stderr.columns ?? process.stdout.columns
  );

  /** 描き直しの回数。<Spinner> のコマを進める (ADR 23) */
  let tick = 0;

  const frameText = async (value: unknown): Promise<string> => {
    const tree = await evaluate(island.frame(value));
    const { segments, exitCode } = layout(tree, { columns, unicode, tick });
    // 終了コードは静的なドキュメントで宣言するもの。フレームの中では誤り
    if (exitCode !== undefined) {
      throw new RenderError(
        '<Exit> cannot appear inside <Dynamic>. Declare it after the region instead'
      );
    }
    // 島はまるごと stderr の領域なので、フレーム内の fd 指定は見ない
    const text = serialize(segments, depth);
    return text === '' || text.endsWith('\n') ? text : `${text}\n`;
  };

  let latest: { value: unknown } | undefined;
  let previousRows = 0;
  let painting = false;
  let closed = false;
  let tickError: unknown;
  /** 進行中の repaint。島を閉じる前に必ず合流する */
  let inflight: Promise<void> = Promise.resolve();

  const paint = async (value: unknown): Promise<void> => {
    const text = await frameText(value);
    tick += 1;
    err.write(`${eraseSequence(previousRows)}${text}`);
    previousRows = frameRows(text, columns);
  };

  /**
   * repaint の失敗で source の待機を打ち切るための口。
   * source が永久に待っていても、フレームが壊れたら present() は落ちる
   */
  let rejectTick: (error: unknown) => void = () => {};
  const tickFailed = new Promise<never>((_, reject) => {
    rejectTick = reject;
  });
  // race に参加しない経路 (非 TTY や完了後) では未処理拒否にしない
  tickFailed.catch(() => {});

  /** interval とリサイズからの再描画。描画中や完了後は何もしない */
  const repaint = (): void => {
    if (closed || latest === undefined || painting) return;
    painting = true;
    inflight = paint(latest.value)
      .catch((error) => {
        tickError = error;
        rejectTick(error);
      })
      .finally(() => {
        painting = false;
      });
  };

  const onResize = (): void => {
    // 明示された幅は文書全体の前提なので、リサイズでも動かさない
    if (!explicitColumns) {
      columns = terminalWidth(process.stderr.columns ?? process.stdout.columns);
    }
    repaint();
  };

  const restoreCursor = (): void => {
    err.write(SHOW_CURSOR);
  };

  const signalHandlers: Array<[string, () => void]> = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  try {
    if (isTTY) {
      err.write(HIDE_CURSOR);
      // 途中で殺されてもカーソルは返す。process.exit() は exit を発火するが、
      // ハンドラの無いシグナルの既定終了は exit を発火しない (実測)
      events.once('exit', restoreCursor);
      for (const [signal, code] of EXIT_SIGNALS) {
        const handler = (): void => {
          restoreCursor();
          // once なので自分は外れている。他にハンドラがいれば終了はそちらに任せる
          if (events.listenerCount(signal) === 0) process.exit(code);
        };
        signalHandlers.push([signal, handler]);
        events.once(signal, handler);
      }
      events.on('SIGWINCH', onResize);
      if (island.interval !== undefined) {
        timer = setInterval(repaint, island.interval);
      }
    }

    const iterator = island.source[Symbol.asyncIterator]();
    try {
      while (true) {
        // repaint の失敗と source の次の値を競わせる (TTY のときだけ tick がある)
        const result = isTTY
          ? await Promise.race([iterator.next(), tickFailed])
          : await iterator.next();
        if (result.done === true) break;
        latest = { value: result.value };
        if (!isTTY) continue;
        // source からの値は取りこぼさず順に描く (interval の再描画とは重ねない)
        while (painting) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
        painting = true;
        try {
          await paint(result.value);
        } finally {
          painting = false;
        }
      }
    } catch (error) {
      closed = true;
      // generator の後始末 (finally) を促す。await してはいけない —
      // source が await の途中だと、それが解決するまで return() は
      // 処理されず、永遠に待つ source ではここでデッドロックする
      try {
        void iterator.return?.(undefined)?.then(undefined, () => {});
      } catch {
        // 中断時の後始末の失敗は元のエラーを優先する
      }
      throw error;
    }

    // 島を閉じる: 以後の repaint を止め、進行中の repaint に合流してから確定する
    closed = true;
    await inflight;
    if (tickError !== undefined) throw tickError;

    // 非 TTY は最終フレームだけを 1 回。TTY は最後に描いたものがそのまま残る
    if (!isTTY && latest !== undefined) {
      err.write(await frameText(latest.value));
    }
  } finally {
    closed = true;
    if (timer !== undefined) clearInterval(timer);
    if (isTTY) {
      events.removeListener('SIGWINCH', onResize);
      for (const [signal, handler] of signalHandlers) {
        events.removeListener(signal, handler);
      }
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
  let exitCode: number | undefined;
  let buffer: RenderNode[] = [];

  const flush = (): void => {
    if (buffer.length === 0) return;
    const result = renderTree({ kind: 'group', children: buffer }, options);
    write(result, options.targets);
    if (result.exitCode !== undefined) exitCode = result.exitCode;
    buffer = [];
  };

  for await (const child of documentNodes(node)) {
    if (child.kind === 'dynamic') {
      flush();
      await driveIsland(child, options);
      continue;
    }
    buffer.push(child);
  }
  flush();
  return exitCode;
}
