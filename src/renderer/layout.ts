import type { Fd, Style } from '../jsx/types.ts';
/**
 * (2) レイアウト: 中間ノード木を「セグメント列」に潰す (§6.1)。
 *
 * Phase 1 では折返しや列幅の計算は行わない (Phase 7)。ここで確定するのは
 * 「どの fd に、どの装飾で、どの文字を、どの順で出すか」だけ。
 */
import { RenderError } from './errors.ts';
import type { RenderNode } from './node.ts';

export interface Segment {
  fd: Fd;
  text: string;
  style: Style;
}

export interface LayoutResult {
  segments: Segment[];
  /** `<Exit>` で宣言された終了コード。宣言がなければ undefined */
  exitCode: number | undefined;
}

interface Context {
  fd: Fd;
  style: Style;
  /** `<Line>` の内側にいるか。行の中では改行や fd の切り替えを許さない */
  inLine: boolean;
}

/** 内側の指定が勝つ (undefined のキーは外側を引き継ぐ) */
function mergeStyle(outer: Style, inner: Style): Style {
  return { ...outer, ...inner };
}

export function layout(root: RenderNode): LayoutResult {
  const segments: Segment[] = [];
  let exitCode: number | undefined;

  const walk = (node: RenderNode, ctx: Context): void => {
    switch (node.kind) {
      case 'chars':
        if (node.value !== '') {
          segments.push({ fd: ctx.fd, text: node.value, style: ctx.style });
        }
        return;

      case 'text':
        for (const child of node.children) {
          walk(child, { ...ctx, style: mergeStyle(ctx.style, node.style) });
        }
        return;

      case 'line': {
        if (ctx.inLine) {
          throw new RenderError(
            '<Line> を <Line> の中に置けません。行の入れ子はできません'
          );
        }
        for (const child of node.children) {
          walk(child, { ...ctx, inLine: true });
        }
        // 改行は装飾を持たない (色が次の行に漏れないようにするため)
        segments.push({ fd: ctx.fd, text: '\n', style: {} });
        return;
      }

      case 'br':
        if (ctx.inLine) {
          throw new RenderError('<Br /> を <Line> の中に置けません');
        }
        segments.push({ fd: ctx.fd, text: '\n', style: {} });
        return;

      case 'fd': {
        if (ctx.inLine) {
          throw new RenderError(
            '<Stdout> / <Stderr> を <Line> の中で切り替えられません。1 行は 1 つの出力先に属します'
          );
        }
        for (const child of node.children) {
          walk(child, { ...ctx, fd: node.fd });
        }
        return;
      }

      case 'exit':
        // 最後に評価されたものが勝つ (§5.1)
        exitCode = node.code;
        return;

      case 'group':
        for (const child of node.children) walk(child, ctx);
        return;
    }
  };

  walk(root, { fd: 1, style: {}, inLine: false });
  return { segments, exitCode };
}
