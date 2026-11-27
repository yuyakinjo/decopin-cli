/**
 * `closest()` の距離としきい値 (ADR 30)。
 *
 * 代表的な当たり・外れは test/core/runtime/signals.test.tsx が見ている。
 * ここでは編集距離の数え方、「入力の長さの半分まで」の境界、同点や空文字の扱いを見る。
 *
 * `visibleControls()` は診断に埋める入力から、端末が命令として読む字を
 * 見える表記に替える (test/contract/terminal-safety.test.tsx が経路ごとに見ている)
 */
import { describe, expect, test } from 'bun:test';

import { closest, visibleControls } from '../../src/core/text.ts';

describe('closest', () => {
  test('完全一致はそれを返す', () => {
    expect(closest('build', ['dev', 'build', 'init'])).toBe('build');
  });

  test('挿入・削除・置換をそれぞれ 1 と数える', () => {
    expect(closest('buld', ['build', 'zzzzz'])).toBe('build'); // 挿入 1
    expect(closest('buiild', ['build', 'zzzzz'])).toBe('build'); // 削除 1
    expect(closest('bwild', ['build', 'zzzzz'])).toBe('build'); // 置換 1
  });

  test('距離が一番小さいものを選ぶ', () => {
    expect(closest('deplo', ['delete', 'deploy', 'develop'])).toBe('deploy');
  });

  test('しきい値は入力の長さの半分 (切り上げ) まで', () => {
    // 長さ 4 → 2 まで。'abcd' → 'abxy' は 2、'axyz' は 3
    expect(closest('abcd', ['abxy'])).toBe('abxy');
    expect(closest('abcd', ['axyz'])).toBeUndefined();
    // 長さ 3 → 切り上げて 2 まで
    expect(closest('abc', ['axy'])).toBe('axy');
    expect(closest('abc', ['xyz'])).toBeUndefined();
  });

  test('同じ距離なら先に出てきたものを選ぶ', () => {
    expect(closest('cat', ['bat', 'hat'])).toBe('bat');
    expect(closest('cat', ['hat', 'bat'])).toBe('hat');
  });

  test('空文字の候補は飛ばす', () => {
    expect(closest('a', ['', 'b'])).toBe('b');
    expect(closest('a', [''])).toBeUndefined();
  });

  test('空文字の入力には何も提案しない', () => {
    // しきい値が 0 になるので、どの候補も遠すぎる
    expect(closest('', ['a', 'bc'])).toBeUndefined();
  });

  test('配列以外の Iterable も受け取る', () => {
    expect(closest('stauts', new Set(['status', 'start']))).toBe('status');
    function* names() {
      yield 'list';
      yield 'lint';
    }
    expect(closest('lisst', names())).toBe('list');
  });

  test('日本語など複数バイトの文字も 1 文字として比べる', () => {
    expect(closest('ありがとお', ['ありがとう', 'さようなら'])).toBe(
      'ありがとう'
    );
  });
});

describe('visibleControls', () => {
  const at = (code: number) => String.fromCharCode(code);

  test('制御文字が無ければ同じ文字列を返す', () => {
    for (const text of [
      '',
      'plain',
      'タブ\tは残す',
      '絵文字 🎉 と é',
      'a\nb',
    ]) {
      expect(visibleControls(text)).toBe(text);
    }
  });

  test('C0 は \\xNN に、復帰は \\r にする', () => {
    expect(visibleControls(`a${at(0x1b)}[2K${at(0x0d)}b`)).toBe(
      'a\\x1b[2K\\rb'
    );
    expect(
      visibleControls(`${at(0x00)}${at(0x07)}${at(0x08)}${at(0x1f)}`)
    ).toBe('\\x00\\x07\\x08\\x1f');
  });

  test('DEL と C1 (ESC 無しの CSI など) も替える', () => {
    expect(
      visibleControls(`${at(0x7f)}${at(0x80)}${at(0x9b)}${at(0x9f)}`)
    ).toBe('\\x7f\\x80\\x9b\\x9f');
    // 範囲のすぐ外は触らない
    expect(visibleControls(`~${at(0xa0)}`)).toBe(`~${at(0xa0)}`);
  });

  test('改行は既定で残し、escape では \\n にする', () => {
    expect(visibleControls('a\nb')).toBe('a\nb');
    expect(visibleControls('a\nb', { newlines: 'escape' })).toBe('a\\nb');
    expect(visibleControls('a\r\nb', { newlines: 'escape' })).toBe('a\\r\\nb');
  });

  test('C0・DEL・C1 を一つ残らず替える', () => {
    for (let code = 0; code <= 0x9f; code++) {
      const isControl = code < 0x20 || code >= 0x7f;
      if (!isControl || code === 0x09) continue;
      const shown = visibleControls(at(code), { newlines: 'escape' });
      expect(shown).not.toContain(at(code));
      expect(shown.startsWith('\\')).toBe(true);
    }
  });
});
