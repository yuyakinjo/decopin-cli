/**
 * `closest()` の距離としきい値 (ADR 30)。
 *
 * 代表的な当たり・外れは test/core/runtime/signals.test.tsx が見ている。
 * ここでは編集距離の数え方、「入力の長さの半分まで」の境界、同点や空文字の扱いを見る
 */
import { describe, expect, test } from 'bun:test';

import { closest } from '../../src/core/text.ts';

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
