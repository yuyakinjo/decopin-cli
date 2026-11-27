import { describe, expect, test } from 'bun:test';

import {
  displayWidth,
  graphemes,
  padEnd,
  padStart,
  terminalWidth,
  truncate,
} from '../../../src/core/renderer/width.ts';

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

  // 印字可能な ASCII は Intl.Segmenter を通さない近道を通る。
  // 近道が Segmenter と同じ結果を返すことをここで固定する
  const viaSegmenter = (text: string): string[] =>
    [
      ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
        text
      ),
    ].map((entry) => entry.segment);

  test('印字可能な ASCII は Intl.Segmenter と同じ結果になる', () => {
    const printable = Array.from({ length: 0x7e - 0x20 + 1 }, (_, index) =>
      String.fromCharCode(0x20 + index)
    ).join('');
    for (const text of ['', 'a', 'HELLO, ALICE!', printable]) {
      expect(graphemes(text)).toEqual(viaSegmenter(text));
    }
  });

  test('制御文字や非 ASCII を含むと Intl.Segmenter の結果になる', () => {
    const crlf = `a${String.fromCharCode(13, 10)}b`;
    // CR LF は 2 文字で 1 書記素
    expect(graphemes(crlf)).toEqual(['a', String.fromCharCode(13, 10), 'b']);
    for (const text of [crlf, `a${String.fromCharCode(9)}b`, 'aあb', 'é']) {
      expect(graphemes(text)).toEqual(viaSegmenter(text));
    }
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
