import { describe, expect, test } from 'bun:test';

import {
  colorCodes,
  nearestColorName,
  parseHex,
} from '../../src/renderer/color.ts';

describe('parseHex', () => {
  test('#rrggbb', () => {
    expect(parseHex('#ff8800')).toEqual([255, 136, 0]);
  });

  test('#rgb は各桁を 2 倍に展開する', () => {
    expect(parseHex('#f80')).toEqual([255, 136, 0]);
  });

  test('解釈できない値は null', () => {
    expect(parseHex('#zzz')).toBeNull();
    expect(parseHex('#ff88')).toBeNull();
  });
});

describe('nearestColorName', () => {
  test('純赤は brightRed', () => {
    expect(nearestColorName([255, 0, 0])).toBe('brightRed');
  });

  test('暗い赤は red', () => {
    expect(nearestColorName([130, 10, 10])).toBe('red');
  });

  test('黒は black', () => {
    expect(nearestColorName([0, 0, 0])).toBe('black');
  });
});

describe('colorCodes', () => {
  test('色名 (前景 / 背景)', () => {
    expect(colorCodes('cyan', 4, false)).toEqual([36]);
    expect(colorCodes('cyan', 4, true)).toEqual([46]);
  });

  test('24bit では 38;2;r;g;b', () => {
    expect(colorCodes('#010203', 24, false)).toEqual([38, 2, 1, 2, 3]);
    expect(colorCodes('#010203', 24, true)).toEqual([48, 2, 1, 2, 3]);
  });

  test('深さ 0 では何も出さない', () => {
    expect(colorCodes('red', 0, false)).toEqual([]);
  });

  test('壊れた 16 進表記は無視する (例外は投げない)', () => {
    expect(colorCodes('#gg0000', 24, false)).toEqual([]);
  });
});
