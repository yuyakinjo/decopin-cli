import type { BorderStyle } from '../components/index.ts';
import type { Fd } from '../jsx/types.ts';
/**
 * 行の並びを組み替える (§5.3)。字下げ・罫線・横並び。
 * どれも「子を描いた結果の幅」を測ってから組む。
 */
import { lineWidth, padLine, textLine, truncateLine } from './lines.ts';
import type { SegmentLine } from './lines.ts';
import { displayWidth, truncate } from './width.ts';

/** 罫線の文字 */
const BORDERS: Record<
  Exclude<BorderStyle, 'none'>,
  {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
  }
> = {
  round: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  },
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
};

/** ASCII しか出せない端末向け */
const ASCII_BORDER = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
};

export function indentLines(
  lines: SegmentLine[],
  by: number,
  fd: Fd
): SegmentLine[] {
  const prefix = ' '.repeat(Math.max(0, by));
  // 空行に空白だけを残すと、コピーしたときに余分な空白が付く
  return lines.map((line) =>
    line.length === 0 ? line : [{ fd, text: prefix, style: {} }, ...line]
  );
}

export interface BoxOptions {
  border: BorderStyle;
  title?: string;
  fd: Fd;
  /** 使える桁数 */
  available: number;
  unicode: boolean;
}

export function boxLines(
  lines: SegmentLine[],
  options: BoxOptions
): SegmentLine[] {
  if (options.border === 'none') return lines;

  const chars = options.unicode ? BORDERS[options.border] : ASCII_BORDER;
  const titleWidth =
    options.title === undefined ? 0 : displayWidth(options.title) + 2;
  // 枠 (2) と左右の余白 (2) を引いた残りが中身に使える
  const maxInner = Math.max(1, options.available - 4);
  const contentWidth = Math.max(...lines.map(lineWidth), titleWidth, 0);
  const inner = Math.min(maxInner, contentWidth);

  const top = buildTop(chars, options.title, inner, options.unicode);
  const bottom = `${chars.bottomLeft}${chars.horizontal.repeat(inner + 2)}${chars.bottomRight}`;

  const body = lines.map((line) => {
    const fitted = padLine(truncateLine(line, inner), inner, options.fd);
    return [
      { fd: options.fd, text: `${chars.vertical} `, style: {} },
      ...fitted,
      { fd: options.fd, text: ` ${chars.vertical}`, style: {} },
    ];
  });

  return [textLine(top, options.fd), ...body, textLine(bottom, options.fd)];
}

function buildTop(
  chars: typeof ASCII_BORDER,
  title: string | undefined,
  inner: number,
  unicode: boolean
): string {
  const total = inner + 2;
  if (title === undefined || title === '') {
    return `${chars.topLeft}${chars.horizontal.repeat(total)}${chars.topRight}`;
  }
  const label = truncate(title, Math.max(1, total - 4), unicode ? '…' : '..');
  const rest = total - displayWidth(label) - 3;
  return `${chars.topLeft}${chars.horizontal} ${label} ${chars.horizontal.repeat(Math.max(0, rest))}${chars.topRight}`;
}

export interface ColumnsOptions {
  gap: number;
  fd: Fd;
  /** 使える桁数 */
  available: number;
}

/** 列ごとの行の並びを横に並べる */
export function columnsLines(
  columns: SegmentLine[][],
  options: ColumnsOptions
): SegmentLine[] {
  const present = columns.filter((column) => column.length > 0);
  if (present.length === 0) return [];

  const natural = present.map((column) =>
    Math.max(0, ...column.map(lineWidth))
  );
  const gaps = options.gap * (present.length - 1);
  const widths = fitWidths(natural, options.available - gaps);
  const rows = Math.max(...present.map((column) => column.length));

  const lines: SegmentLine[] = [];
  for (let row = 0; row < rows; row += 1) {
    const line: SegmentLine = [];
    for (const [index, column] of present.entries()) {
      const width = widths[index] as number;
      if (index > 0 && options.gap > 0) {
        line.push({
          fd: options.fd,
          text: ' '.repeat(options.gap),
          style: {},
        });
      }
      const source = column[row] ?? [];
      const isLast = index === present.length - 1;
      const fitted = truncateLine(source, width);
      // 最後の列は右側を埋めない (行末に空白を残さない)
      line.push(...(isLast ? fitted : padLine(fitted, width, options.fd)));
    }
    lines.push(trimTrailingSpaces(line));
  }
  return lines;
}

/** 行末の空白だけのセグメントを落とす (コピーしたときに邪魔になる) */
function trimTrailingSpaces(line: SegmentLine): SegmentLine {
  const result = [...line];
  while (result.length > 0) {
    const last = result[result.length - 1] as SegmentLine[number];
    if (last.text.trim() !== '') break;
    result.pop();
  }
  return result;
}

/**
 * 自然な幅の合計が使える桁数を超える場合、比率を保って縮める。
 * 最低 3 桁 (省略記号 + 1 文字) は残す。
 */
export function fitWidths(natural: number[], available: number): number[] {
  const total = natural.reduce((sum, width) => sum + width, 0);
  if (total <= available || total === 0) return natural;

  const minimum = 3;
  const scaled = natural.map((width) =>
    Math.max(minimum, Math.floor((width / total) * available))
  );

  // 端数で溢れることがあるので、広い列から 1 桁ずつ削る
  let overflow = scaled.reduce((sum, width) => sum + width, 0) - available;
  while (overflow > 0) {
    const widest = scaled.indexOf(Math.max(...scaled));
    if ((scaled[widest] as number) <= minimum) break;
    scaled[widest] = (scaled[widest] as number) - 1;
    overflow -= 1;
  }
  return scaled;
}
