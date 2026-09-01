import type { Align, Cell, SymbolKind } from '../components/index.ts';
import type { Fd, Style } from '../jsx/types.ts';
import { fitWidths } from './frames.ts';
/**
 * データを渡すだけで組み立てられる表示 (List / Table / KeyValue / Json)。
 * 幅を測る必要があるので、コンポーネントではなくレンダラー側で組む。
 */
import { padded, textLine } from './lines.ts';
import type { SegmentLine } from './lines.ts';
import { displayWidth, padStart, truncate } from './width.ts';

/** 状態の記号。UTF-8 でない端末では ASCII に落とす */
export const SYMBOLS: Record<
  SymbolKind,
  { unicode: string; ascii: string; style: Style }
> = {
  success: { unicode: '✔', ascii: '+', style: { color: 'green' } },
  warn: { unicode: '⚠', ascii: '!', style: { color: 'yellow' } },
  info: { unicode: 'ℹ', ascii: 'i', style: { color: 'blue' } },
  danger: { unicode: '✖', ascii: 'x', style: { color: 'red' } },
};

/**
 * 回転する記号のコマ。UTF-8 でない端末では ASCII に落とす。
 * 進めるのは時刻ではなく描き直しの回数 (ADR 23)
 */
export const SPINNER_FRAMES: { unicode: string[]; ascii: string[] } = {
  unicode: [
    '\u280b',
    '\u2819',
    '\u2839',
    '\u2838',
    '\u283c',
    '\u2834',
    '\u2826',
    '\u2827',
    '\u2807',
    '\u280f',
  ],
  ascii: ['|', '/', '-', '\\'],
};

/** 進捗のバー 1 本ぶんの文字列。value は 0..max に丸める */
export function progressBarText(
  value: number,
  max: number,
  width: number,
  unicode: boolean
): string {
  const ratio = Math.min(1, Math.max(0, value / max));
  // 端は端として見せる: 0 は空、満了だけが全部埋まる
  const filled =
    ratio === 0
      ? 0
      : ratio === 1
        ? width
        : Math.max(1, Math.min(width - 1, Math.round(ratio * width)));
  const [on, off] = unicode ? ['\u2588', '\u2591'] : ['#', '-'];
  return on.repeat(filled) + off.repeat(width - filled);
}

function cellText(cell: Cell): string {
  return cell === null || cell === undefined ? '' : String(cell);
}

export interface ListInput {
  items: readonly Cell[];
  ordered: boolean;
  bullet: string;
  fd: Fd;
}

export function listLines(input: ListInput): SegmentLine[] {
  const width = input.ordered ? String(input.items.length).length : 0;
  return input.items.map((item, index) => {
    const marker = input.ordered
      ? padStart(`${index + 1}.`, width + 1)
      : input.bullet;
    return [
      { fd: input.fd, text: `${marker} `, style: { dim: true } },
      ...textLine(cellText(item), input.fd),
    ];
  });
}

export interface TableInput {
  columns: readonly string[];
  rows: ReadonlyArray<readonly Cell[]>;
  align: readonly Align[];
  headless: boolean;
  fd: Fd;
  available: number;
}

const COLUMN_GAP = 2;

export function tableLines(input: TableInput): SegmentLine[] {
  const count = Math.max(
    input.columns.length,
    ...input.rows.map((row) => row.length),
    0
  );
  if (count === 0) return [];

  const texts = input.rows.map((row) =>
    Array.from({ length: count }, (_, index) => cellText(row[index]))
  );
  const headers = Array.from(
    { length: count },
    (_, index) => input.columns[index] ?? ''
  );

  const natural = Array.from({ length: count }, (_, index) =>
    Math.max(
      input.headless ? 0 : displayWidth(headers[index] as string),
      ...texts.map((row) => displayWidth(row[index] as string)),
      0
    )
  );
  const gaps = COLUMN_GAP * (count - 1);
  const widths = fitWidths(natural, Math.max(count, input.available - gaps));

  const line = (values: string[], style: Style): SegmentLine => {
    const segments: SegmentLine = [];
    for (let index = 0; index < count; index += 1) {
      const width = widths[index] as number;
      const value = truncate(values[index] as string, width);
      const isLast = index === count - 1;
      const aligned =
        input.align[index] === 'right'
          ? padStart(value, width)
          : isLast
            ? value // 行末に空白を残さない
            : undefined;
      segments.push(
        aligned === undefined
          ? padded(value, width, input.fd, style)
          : { fd: input.fd, text: aligned, style }
      );
      if (!isLast) {
        segments.push({
          fd: input.fd,
          text: ' '.repeat(COLUMN_GAP),
          style: {},
        });
      }
    }
    return segments;
  };

  const body = texts.map((row) => line(row, {}));
  return input.headless ? body : [line(headers, { bold: true }), ...body];
}

export interface KeyValueInput {
  data: Readonly<Record<string, Cell>>;
  align: Align;
  separator: string;
  fd: Fd;
}

export function keyValueLines(input: KeyValueInput): SegmentLine[] {
  const keys = Object.keys(input.data);
  const separatorWidth = displayWidth(input.separator);
  const keyWidth = Math.max(0, ...keys.map(displayWidth));
  // 区切りごと桁を合わせる。キーだけを揃えると "routes : 6" のようにずれる
  const width = keyWidth + separatorWidth;
  return keys.map((key) => {
    const label =
      input.align === 'right'
        ? `${padStart(key, keyWidth)}${input.separator}`
        : `${key}${input.separator}`;
    return [
      padded(label, width, input.fd, { dim: true }),
      ...textLine(cellText(input.data[key]), input.fd),
    ];
  });
}

export interface JsonInput {
  value: unknown;
  indent: number;
  fd: Fd;
}

/** JSON を構文着色して行にする */
export function jsonLines(input: JsonInput): SegmentLine[] {
  const lines: SegmentLine[] = [];
  let current: SegmentLine = [];

  const push = (text: string, style: Style = {}): void => {
    if (text !== '') current.push({ fd: input.fd, text, style });
  };
  const newline = (depth: number): void => {
    lines.push(current);
    current = [];
    push(' '.repeat(depth * input.indent));
  };

  const walk = (value: unknown, depth: number): void => {
    if (value === null) return push('null', { color: 'magenta' });
    if (typeof value === 'boolean') {
      return push(String(value), { color: 'magenta' });
    }
    if (typeof value === 'number') {
      return push(String(value), { color: 'yellow' });
    }
    if (typeof value === 'string') {
      return push(JSON.stringify(value), { color: 'green' });
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return push('[]');
      push('[');
      for (const [index, item] of value.entries()) {
        newline(depth + 1);
        walk(item, depth + 1);
        if (index < value.length - 1) push(',');
      }
      newline(depth);
      return push(']');
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return push('{}');
      push('{');
      for (const [index, [key, item]] of entries.entries()) {
        newline(depth + 1);
        push(JSON.stringify(key), { color: 'cyan' });
        push(': ');
        walk(item, depth + 1);
        if (index < entries.length - 1) push(',');
      }
      newline(depth);
      return push('}');
    }
    // 関数や undefined は JSON にできないので、そのことが分かる表示にする
    push(String(value), { dim: true });
  };

  walk(input.value, 0);
  lines.push(current);
  return lines;
}
