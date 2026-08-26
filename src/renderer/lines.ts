import type { Fd } from '../jsx/types.ts';
import type { Segment } from './layout.ts';
/**
 * セグメント列を「行」として扱うための道具 (§6.1 の (2))。
 *
 * `Box` や `Columns` は「子を描いた結果の幅」を知らないと組めないので、
 * いったん行に分けて測る。ANSI の装飾はセグメントの属性として分離して
 * あるので、表示幅の計算に混ざらない。
 */
import { displayWidth, graphemes, padEnd } from './width.ts';

/** 改行を含まないセグメントの並び */
export type SegmentLine = Segment[];

/** セグメント列を行に分ける */
export function toLines(segments: Segment[]): SegmentLine[] {
  const lines: SegmentLine[] = [[]];
  for (const segment of segments) {
    const parts = segment.text.split('\n');
    for (const [index, part] of parts.entries()) {
      if (index > 0) lines.push([]);
      if (part !== '') {
        (lines[lines.length - 1] as SegmentLine).push({
          ...segment,
          text: part,
        });
      }
    }
  }
  // 末尾の改行で増えた空行は落とす
  if (
    lines.length > 1 &&
    (lines[lines.length - 1] as SegmentLine).length === 0
  ) {
    lines.pop();
  }
  return lines;
}

/** 行をセグメント列に戻す (行ごとに改行を足す) */
export function fromLines(lines: SegmentLine[], fd: Fd): Segment[] {
  const segments: Segment[] = [];
  for (const line of lines) {
    segments.push(...line);
    segments.push({ fd, text: '\n', style: {} });
  }
  return segments;
}

/** 行の表示幅 */
export function lineWidth(line: SegmentLine): number {
  let total = 0;
  for (const segment of line) total += displayWidth(segment.text);
  return total;
}

/** 行を指定の幅まで空白で埋める */
export function padLine(line: SegmentLine, width: number, fd: Fd): SegmentLine {
  const missing = width - lineWidth(line);
  if (missing <= 0) return line;
  return [...line, { fd, text: ' '.repeat(missing), style: {} }];
}

/** 行を指定の幅に収める。切ったら末尾に省略記号を足す */
export function truncateLine(
  line: SegmentLine,
  width: number,
  ellipsis = '…'
): SegmentLine {
  if (lineWidth(line) <= width) return line;
  const limit = Math.max(0, width - displayWidth(ellipsis));

  const result: SegmentLine = [];
  let used = 0;
  for (const segment of line) {
    if (used >= limit) break;
    let text = '';
    for (const grapheme of graphemes(segment.text)) {
      const next = used + displayWidth(grapheme);
      if (next > limit) break;
      text += grapheme;
      used = next;
    }
    if (text !== '') result.push({ ...segment, text });
  }
  const last = line[line.length - 1];
  result.push({
    fd: last?.fd ?? 1,
    text: ellipsis,
    style: {},
  });
  return result;
}

/** 文字列 1 つだけの行を作る */
export function textLine(
  text: string,
  fd: Fd,
  style: Segment['style'] = {}
): SegmentLine {
  return text === '' ? [] : [{ fd, text, style }];
}

/** 表示幅で右に詰めた文字列のセグメント */
export function padded(
  text: string,
  width: number,
  fd: Fd,
  style: Segment['style'] = {}
): Segment {
  return { fd, text: padEnd(text, width), style };
}
