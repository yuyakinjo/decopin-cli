/** 色名・16 進表記から ANSI のカラーコードを求める */
import type { Color, ColorName } from '../jsx/types.ts';

/** 色の表現力。0 = 装飾なし, 4 = 16 色, 24 = 24bit */
export type ColorDepth = 0 | 4 | 24;

/** 16 色名 → 前景色の SGR コード */
const FOREGROUND: Record<ColorName, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

/** 16 色の代表 RGB (16 進表記を丸めるときの基準) */
const PALETTE: readonly [ColorName, [number, number, number]][] = [
  ['black', [0, 0, 0]],
  ['red', [128, 0, 0]],
  ['green', [0, 128, 0]],
  ['yellow', [128, 128, 0]],
  ['blue', [0, 0, 128]],
  ['magenta', [128, 0, 128]],
  ['cyan', [0, 128, 128]],
  ['white', [192, 192, 192]],
  ['brightBlack', [128, 128, 128]],
  ['brightRed', [255, 0, 0]],
  ['brightGreen', [0, 255, 0]],
  ['brightYellow', [255, 255, 0]],
  ['brightBlue', [0, 0, 255]],
  ['brightMagenta', [255, 0, 255]],
  ['brightCyan', [0, 255, 255]],
  ['brightWhite', [255, 255, 255]],
];

export type Rgb = [number, number, number];

/** `#rgb` / `#rrggbb` を RGB に。解釈できなければ null */
export function parseHex(value: string): Rgb | null {
  const hex = value.startsWith('#') ? value.slice(1) : value;
  if (hex.length === 3) {
    const [r, g, b] = [hex[0], hex[1], hex[2]];
    if (!isHexDigits(hex)) return null;
    return [
      Number.parseInt(`${r}${r}`, 16),
      Number.parseInt(`${g}${g}`, 16),
      Number.parseInt(`${b}${b}`, 16),
    ];
  }
  if (hex.length === 6) {
    if (!isHexDigits(hex)) return null;
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

function isHexDigits(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value);
}

/** RGB を 16 色の中で最も近い色名に丸める */
export function nearestColorName(rgb: Rgb): ColorName {
  let best: ColorName = 'white';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [name, candidate] of PALETTE) {
    const distance =
      (rgb[0] - candidate[0]) ** 2 +
      (rgb[1] - candidate[1]) ** 2 +
      (rgb[2] - candidate[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }
  return best;
}

/**
 * 色を SGR パラメータ列にする。
 * @param background 背景色として出すか
 */
export function colorCodes(
  color: Color,
  depth: ColorDepth,
  background: boolean
): number[] {
  if (depth === 0) return [];

  if (!color.startsWith('#')) {
    const base = FOREGROUND[color as ColorName];
    if (base === undefined) return [];
    return [background ? base + 10 : base];
  }

  const rgb = parseHex(color);
  if (rgb === null) return [];

  if (depth === 24) {
    return [background ? 48 : 38, 2, rgb[0], rgb[1], rgb[2]];
  }
  const base = FOREGROUND[nearestColorName(rgb)];
  return [background ? base + 10 : base];
}
