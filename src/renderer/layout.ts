import type { Fd, Style } from '../jsx/types.ts';
/**
 * (2) レイアウト: 中間ノード木を「セグメント列」に潰す (ADR 1)。
 *
 * ここで確定するのは「どの fd に、どの装飾で、どの文字を、どの順で出すか」。
 * `Box` / `Columns` / `Table` のように**幅を測ってから組む**ものは、
 * いったん子を行に描いてから組み替える。
 *
 * `<Line>` の折返しは行わない。端末が自分で折り返すし、パイプに流すときに
 * 勝手に改行が増えると、受け側の行単位の処理が壊れるため。
 */
import {
  jsonLines,
  keyValueLines,
  listLines,
  progressBarText,
  SPINNER_FRAMES,
  SYMBOLS,
  tableLines,
} from './data.ts';
import { RenderError } from './errors.ts';
import { boxLines, columnsLines, indentLines } from './frames.ts';
import { fromLines, toLines } from './lines.ts';
import type { SegmentLine } from './lines.ts';
import type { RenderNode } from './node.ts';
import { terminalWidth } from './width.ts';

export interface Segment {
  fd: Fd;
  text: string;
  style: Style;
  /** OSC 8 のハイパーリンク先 */
  link?: string;
}

export interface LayoutResult {
  segments: Segment[];
  /** `<Exit>` で宣言された終了コード。宣言がなければ undefined */
  exitCode: number | undefined;
}

export interface LayoutOptions {
  /** 端末の桁数 */
  columns?: number;
  /** UTF-8 の記号を使えるか。偽なら ASCII に落とす */
  unicode?: boolean;
  /**
   * 何回目の描き直しか。`<Spinner>` のコマを決める (ADR 23)。
   * 静的な出力では 0 のまま
   */
  tick?: number;
}

interface Context {
  fd: Fd;
  style: Style;
  /** `<Line>` の内側にいるか。行の中では改行や fd の切り替えを許さない */
  inLine: boolean;
  /** 使える桁数 (Box の中では枠の分だけ狭くなる) */
  available: number;
}

/** 内側の指定が勝つ (undefined のキーは外側を引き継ぐ) */
function mergeStyle(outer: Style, inner: Style): Style {
  return { ...outer, ...inner };
}

/** 行を組み替えるノードは、行の中に置けない */
const BLOCK_ONLY: Record<string, string> = {
  line: '<Line> cannot be nested inside another <Line>',
  br: '<Br /> cannot appear inside a <Line>',
  indent: '<Indent> cannot appear inside a <Line>',
  box: '<Box> cannot appear inside a <Line>',
  columns: '<Columns> cannot appear inside a <Line>',
  list: '<List> cannot appear inside a <Line>',
  table: '<Table> cannot appear inside a <Line>',
  keyvalue: '<KeyValue> cannot appear inside a <Line>',
  json: '<Json> cannot appear inside a <Line>',
};

export function layout(
  root: RenderNode,
  options: LayoutOptions = {}
): LayoutResult {
  const width = terminalWidth(options.columns);
  const unicode = options.unicode ?? true;
  const tick = options.tick ?? 0;
  const segments: Segment[] = [];
  let exitCode: number | undefined;

  const walk = (node: RenderNode, ctx: Context, out: Segment[]): void => {
    const blockOnly = BLOCK_ONLY[node.kind];
    if (blockOnly !== undefined && ctx.inLine) {
      throw new RenderError(blockOnly);
    }

    switch (node.kind) {
      case 'chars':
        if (node.value !== '') {
          out.push({ fd: ctx.fd, text: node.value, style: ctx.style });
        }
        return;

      case 'text':
        for (const child of node.children) {
          walk(
            child,
            { ...ctx, style: mergeStyle(ctx.style, node.style) },
            out
          );
        }
        return;

      case 'link': {
        const style = mergeStyle(ctx.style, node.style);
        const inner: Segment[] = [];
        for (const child of node.children) {
          walk(child, { ...ctx, style }, inner);
        }
        // 子が無ければ URL 自体を見せる
        const shown =
          inner.length === 0 ? [{ fd: ctx.fd, text: node.href, style }] : inner;
        for (const segment of shown) {
          out.push({ ...segment, link: node.href });
        }
        return;
      }

      case 'line':
        for (const child of node.children) {
          walk(child, { ...ctx, inLine: true }, out);
        }
        // 改行は装飾を持たない (色が次の行に漏れないようにするため)
        out.push({ fd: ctx.fd, text: '\n', style: {} });
        return;

      case 'br':
        out.push({ fd: ctx.fd, text: '\n', style: {} });
        return;

      case 'fd': {
        if (ctx.inLine) {
          throw new RenderError(
            '<Stdout> / <Stderr> cannot switch inside a <Line>. A line belongs to a single output'
          );
        }
        for (const child of node.children) {
          walk(child, { ...ctx, fd: node.fd }, out);
        }
        return;
      }

      case 'exit':
        // 最後に評価されたものが勝つ
        exitCode = node.code;
        return;

      case 'dynamic':
        // 島の駆動は present() の仕事 (ADR 22)。ここに来るのは、測って組む
        // コンテナや <Line> の中など、領域として扱えない場所に置かれたとき
        throw new RenderError(
          '<Dynamic> must be a top-level block in the command output (not inside <Line>, <Box>, <Indent>, <Columns>, <Stdout> or <Stderr>)'
        );

      case 'group':
        for (const child of node.children) walk(child, ctx, out);
        return;

      case 'symbol': {
        const symbol = SYMBOLS[node.symbol];
        out.push({
          fd: ctx.fd,
          text: unicode ? symbol.unicode : symbol.ascii,
          style: mergeStyle(ctx.style, symbol.style),
        });
        return;
      }

      case 'spinner': {
        const frames = unicode ? SPINNER_FRAMES.unicode : SPINNER_FRAMES.ascii;
        // 負の tick は来ない想定だが、剰余が負にならないようにしておく
        const index = ((tick % frames.length) + frames.length) % frames.length;
        out.push({
          fd: ctx.fd,
          text: frames[index] as string,
          style: ctx.style,
        });
        return;
      }

      case 'progress':
        out.push({
          fd: ctx.fd,
          text: progressBarText(node.value, node.max, node.width, unicode),
          style: ctx.style,
        });
        return;

      case 'indent':
        out.push(
          ...fromLines(
            indentLines(
              block(node.children, {
                ...ctx,
                available: ctx.available - node.by,
              }),
              node.by,
              ctx.fd
            ),
            ctx.fd
          )
        );
        return;

      case 'box': {
        const available = Math.min(
          ctx.available,
          node.maxWidth ?? ctx.available
        );
        out.push(
          ...fromLines(
            boxLines(
              block(node.children, { ...ctx, available: available - 4 }),
              {
                border: node.border,
                title: node.title,
                fd: ctx.fd,
                available,
                unicode,
              }
            ),
            ctx.fd
          )
        );
        return;
      }

      case 'columns': {
        const count = Math.max(1, node.children.length);
        const per = Math.floor(
          (ctx.available - node.gap * (count - 1)) / count
        );
        const columns = node.children.map((child) =>
          block([child], { ...ctx, available: Math.max(1, per) })
        );
        out.push(
          ...fromLines(
            columnsLines(columns, {
              gap: node.gap,
              fd: ctx.fd,
              available: ctx.available,
            }),
            ctx.fd
          )
        );
        return;
      }

      case 'list':
        out.push(...fromLines(listLines({ ...node, fd: ctx.fd }), ctx.fd));
        return;

      case 'table':
        out.push(
          ...fromLines(
            tableLines({ ...node, fd: ctx.fd, available: ctx.available }),
            ctx.fd
          )
        );
        return;

      case 'keyvalue':
        out.push(...fromLines(keyValueLines({ ...node, fd: ctx.fd }), ctx.fd));
        return;

      case 'json':
        out.push(...fromLines(jsonLines({ ...node, fd: ctx.fd }), ctx.fd));
        return;
    }
  };

  /** 子を独立した buffer に描いて、行に分ける */
  const block = (children: RenderNode[], ctx: Context): SegmentLine[] => {
    const buffer: Segment[] = [];
    for (const child of children) {
      walk(child, { ...ctx, inLine: false }, buffer);
    }
    return toLines(buffer);
  };

  walk(root, { fd: 1, style: {}, inLine: false, available: width }, segments);
  return { segments, exitCode };
}
