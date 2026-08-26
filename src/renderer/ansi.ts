import type { Style } from '../jsx/types.ts';
/**
 * (3) 直列化: セグメント列を fd ごとの文字列にする (§6.1)。
 * 色を落とす判定はここで効く (深さ 0 なら装飾を一切出さない)。
 */
import { colorCodes } from './color.ts';
import type { ColorDepth } from './color.ts';
import type { Segment } from './layout.ts';

const ESC = '\x1b';
const RESET = `${ESC}[0m`;

/** 装飾 → SGR パラメータ */
const ATTRIBUTES: readonly [keyof Style, number][] = [
  ['bold', 1],
  ['dim', 2],
  ['italic', 3],
  ['underline', 4],
  ['inverse', 7],
  ['strikethrough', 9],
];

/** 装飾の開始シーケンス。装飾が無ければ空文字 */
export function openSequence(style: Style, depth: ColorDepth): string {
  if (depth === 0) return '';

  const codes: number[] = [];
  for (const [key, code] of ATTRIBUTES) {
    if (style[key] === true) codes.push(code);
  }
  if (style.color !== undefined) {
    codes.push(...colorCodes(style.color, depth, false));
  }
  if (style.bg !== undefined) {
    codes.push(...colorCodes(style.bg, depth, true));
  }
  return codes.length === 0 ? '' : `${ESC}[${codes.join(';')}m`;
}

/**
 * OSC 8 のハイパーリンク。装飾を落とす設定のときは `text (url)` にする
 * (リンクを開けない端末でも URL が見えるように)
 */
function withLink(text: string, href: string, depth: ColorDepth): string {
  if (depth === 0) return text === href ? text : `${text} (${href})`;
  return `${ESC}]8;;${href}${ESC}\\${text}${ESC}]8;;${ESC}\\`;
}

/** セグメント列を 1 本の文字列にする */
export function serialize(segments: Segment[], depth: ColorDepth): string {
  let out = '';
  for (const segment of segments) {
    const open = openSequence(segment.style, depth);
    const styled =
      open === '' ? segment.text : `${open}${segment.text}${RESET}`;
    out +=
      segment.link === undefined
        ? styled
        : withLink(styled, segment.link, depth);
  }
  return out;
}
