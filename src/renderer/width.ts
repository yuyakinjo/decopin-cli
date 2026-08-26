/**
 * 文字の**表示幅**を数える (§6.3)。
 *
 * `String.length` は UTF-16 の長さなので、日本語は 1、絵文字は 2 と数えて
 * しまう。端末の桁数と合わないと罫線や表がずれるので、自前で数える。
 */

/** 表示幅 2 の文字の範囲 (East Asian Wide / Fullwidth と主な絵文字) */
const WIDE_RANGES: readonly [number, number][] = [
  [0x1100, 0x115f], // ハングル字母
  [0x2e80, 0x303e], // CJK 部首補助・記号
  [0x3041, 0x33ff], // ひらがな・カタカナ・CJK 互換
  [0x3400, 0x4dbf], // CJK 拡張 A
  [0x4e00, 0x9fff], // CJK 統合漢字
  [0xa000, 0xa4cf], // イ文字
  [0xac00, 0xd7a3], // ハングル音節
  [0xf900, 0xfaff], // CJK 互換漢字
  [0xfe10, 0xfe19], // 縦書き用記号
  [0xfe30, 0xfe6f], // CJK 互換形
  [0xff00, 0xff60], // 全角英数
  [0xffe0, 0xffe6], // 全角記号
  [0x1f300, 0x1f64f], // 絵文字 (記号・顔)
  [0x1f680, 0x1f6ff], // 絵文字 (乗り物)
  [0x1f900, 0x1f9ff], // 絵文字 (補助)
  [0x20000, 0x3fffd], // CJK 拡張 B 以降
];

/** 表示幅 0 の文字 (結合文字と異体字セレクタ) */
const ZERO_RANGES: readonly [number, number][] = [
  [0x0300, 0x036f], // 結合分音記号
  [0x200b, 0x200f], // ゼロ幅スペース・方向制御
  [0xfe00, 0xfe0f], // 異体字セレクタ
  [0x1ab0, 0x1aff],
  [0x20d0, 0x20ff],
];

function inRanges(code: number, ranges: readonly [number, number][]): boolean {
  for (const [start, end] of ranges) {
    if (code >= start && code <= end) return true;
  }
  return false;
}

/** 1 つのコードポイントの表示幅 */
function codePointWidth(code: number): number {
  if (code < 0x20) return 0; // 制御文字
  if (inRanges(code, ZERO_RANGES)) return 0;
  if (inRanges(code, WIDE_RANGES)) return 2;
  return 1;
}

const segmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined;

/** 書記素 (人が 1 文字と見なす単位) に分ける */
export function graphemes(text: string): string[] {
  if (segmenter === undefined) return [...text];
  return [...segmenter.segment(text)].map((entry) => entry.segment);
}

/** 書記素 1 つの表示幅。先頭のコードポイントで決める */
function graphemeWidth(grapheme: string): number {
  const first = grapheme.codePointAt(0);
  if (first === undefined) return 0;
  const width = codePointWidth(first);
  // 絵文字の異体字セレクタ付き (例: ✔️) は 2 桁として扱う端末が多い
  if (width === 1 && grapheme.includes('️')) return 2;
  return width;
}

/** 文字列の表示幅 */
export function displayWidth(text: string): number {
  let total = 0;
  for (const grapheme of graphemes(text)) {
    total += graphemeWidth(grapheme);
  }
  return total;
}

/** 表示幅を指定の桁に収める。切ったら末尾に ellipsis を付ける */
export function truncate(
  text: string,
  maxWidth: number,
  ellipsis = '…'
): string {
  if (maxWidth <= 0) return '';
  if (displayWidth(text) <= maxWidth) return text;

  const ellipsisWidth = displayWidth(ellipsis);
  if (maxWidth <= ellipsisWidth) return ellipsis.slice(0, maxWidth);

  let result = '';
  let width = 0;
  for (const grapheme of graphemes(text)) {
    const next = width + graphemeWidth(grapheme);
    if (next > maxWidth - ellipsisWidth) break;
    result += grapheme;
    width = next;
  }
  return `${result}${ellipsis}`;
}

/** 表示幅で右に詰める */
export function padEnd(text: string, width: number, fill = ' '): string {
  const missing = width - displayWidth(text);
  return missing <= 0 ? text : `${text}${fill.repeat(missing)}`;
}

/** 表示幅で左に詰める */
export function padStart(text: string, width: number, fill = ' '): string {
  const missing = width - displayWidth(text);
  return missing <= 0 ? text : `${fill.repeat(missing)}${text}`;
}

/** 端末の桁数。取得できなければ 80 (§6.3) */
export function terminalWidth(columns?: number): number {
  return columns !== undefined && columns > 0 ? columns : 80;
}
