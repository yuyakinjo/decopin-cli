/**
 * decopin 自身の CLI が使う手書きの argv パーサ (src/cli/argv.ts)。
 *
 * 各 cmd.ts はここを通して argv を読むので、境界の振る舞い
 * (値が無い・`=` 形式・位置引数の拾い方) を固定しておく
 */
import { describe, expect, test } from 'bun:test';

import { hasFlag, optionValue, positionals } from '../../src/cli/argv.ts';

describe('optionValue', () => {
  test('`--name value` の value を返す', () => {
    expect(optionValue(['build', '--app', 'src/app'], '--app')).toBe('src/app');
  });

  test('無ければ undefined', () => {
    expect(optionValue(['build', '--out', 'dist'], '--app')).toBeUndefined();
  });

  test('末尾にあって値が続かなければ undefined', () => {
    expect(optionValue(['build', '--app'], '--app')).toBeUndefined();
  });

  test('`--name=value` は受けない', () => {
    expect(optionValue(['build', '--app=src'], '--app')).toBeUndefined();
  });

  test('複数あれば最初のものを使う', () => {
    expect(optionValue(['build', '--out', 'a', '--out', 'b'], '--out')).toBe(
      'a'
    );
  });

  test('次の引数がフラグでもそのまま値として返す (検査は呼ぶ側の責任)', () => {
    expect(optionValue(['docs', '--out', '--no-run'], '--out')).toBe(
      '--no-run'
    );
  });
});

describe('hasFlag', () => {
  test('完全一致のときだけ true', () => {
    expect(hasFlag(['build', '--minify'], '--minify')).toBe(true);
    expect(hasFlag(['build', '--minify=false'], '--minify')).toBe(false);
    expect(hasFlag(['build'], '--minify')).toBe(false);
  });
});

describe('positionals', () => {
  test('サブコマンド名を除き、`-` で始まらない引数を順に返す', () => {
    expect(positionals(['init', 'my-cli', '--no-install'])).toEqual(['my-cli']);
    expect(positionals(['init', 'a', '-x', 'b'])).toEqual(['a', 'b']);
  });

  test('サブコマンドだけなら空', () => {
    expect(positionals(['init'])).toEqual([]);
    expect(positionals([])).toEqual([]);
  });

  test('オプションの値も位置引数として拾う (値付きオプションとは区別しない)', () => {
    expect(positionals(['init', '--app', 'src'])).toEqual(['src']);
  });
});
