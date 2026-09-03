import { describe, expect, test } from 'bun:test';

import {
  displayWidth,
  graphemes,
  padEnd,
  padStart,
  terminalWidth,
  truncate,
} from '../../src/core/renderer/width.ts';

describe('displayWidth', () => {
  test('ASCII は 1 文字 1 桁', () => {
    expect(displayWidth('hello')).toBe(5);
  });

  test('日本語は 1 文字 2 桁', () => {
    expect(displayWidth('こんにちは')).toBe(10);
    expect(displayWidth('日本語abc')).toBe(9);
  });

  test('全角記号も 2 桁', () => {
    expect(displayWidth('！？')).toBe(4);
  });

  test('絵文字は 2 桁', () => {
    expect(displayWidth('🎉')).toBe(2);
    expect(displayWidth('🚀🚀')).toBe(4);
  });

  test('異体字セレクタ付きの記号も 2 桁', () => {
    expect(displayWidth('✔️')).toBe(2);
  });

  test('結合文字は 0 桁 (a + アクセントで 1 桁)', () => {
    expect(displayWidth(`a${String.fromCodePoint(0x301)}`)).toBe(1);
  });

  test('String.length とは違う', () => {
    expect('こんにちは'.length).toBe(5);
    expect(displayWidth('こんにちは')).toBe(10);
  });
});

describe('graphemes', () => {
  test('人が 1 文字と見なす単位で分ける (結合文字をまとめる)', () => {
    // a + 結合アクセント (U+0301)
    const combining = `a${String.fromCodePoint(0x301)}bc`;
    expect(graphemes(combining)).toEqual([
      `a${String.fromCodePoint(0x301)}`,
      'b',
      'c',
    ]);
  });
});

describe('truncate', () => {
  test('収まっていればそのまま', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  test('切ったら省略記号を足す', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
    expect(displayWidth(truncate('hello world', 8))).toBe(8);
  });

  test('日本語も表示幅で切る', () => {
    expect(truncate('こんにちは世界', 8)).toBe('こんに…');
    expect(displayWidth(truncate('こんにちは世界', 8))).toBeLessThanOrEqual(8);
  });

  test('幅が足りなければ省略記号だけ', () => {
    expect(truncate('hello', 1)).toBe('…');
    expect(truncate('hello', 0)).toBe('');
  });
});

describe('padEnd / padStart', () => {
  test('表示幅で詰める', () => {
    expect(padEnd('日本', 8)).toBe('日本    ');
    expect(padStart('日本', 8)).toBe('    日本');
  });

  test('すでに超えていれば足さない', () => {
    expect(padEnd('hello', 3)).toBe('hello');
  });
});

describe('terminalWidth', () => {
  test('取得できなければ 80', () => {
    expect(terminalWidth(undefined)).toBe(80);
    expect(terminalWidth(0)).toBe(80);
  });

  test('渡された桁数を使う', () => {
    expect(terminalWidth(120)).toBe(120);
  });
});
