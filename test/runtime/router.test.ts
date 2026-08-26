import { describe, expect, test } from 'bun:test';

import { resolveRoute, suggest } from '../../src/runtime/router.ts';
import type { RouteTable } from '../../src/runtime/router.ts';

const load = async () => ({ default: () => null });

const table: RouteTable = {
  hello: load,
  user: load,
  'user/create': load,
  'user/list': load,
};

describe('resolveRoute', () => {
  test('単一のコマンド', () => {
    expect(resolveRoute(table, ['hello'])).toEqual({ name: 'hello', rest: [] });
  });

  test('残りのトークンを rest に渡す', () => {
    expect(resolveRoute(table, ['hello', 'alice', '--loud'])).toEqual({
      name: 'hello',
      rest: ['alice', '--loud'],
    });
  });

  test('より長く一致するものを選ぶ', () => {
    expect(resolveRoute(table, ['user', 'create'])).toEqual({
      name: 'user/create',
      rest: [],
    });
  });

  test('親コマンドだけでも解決できる', () => {
    expect(resolveRoute(table, ['user'])).toEqual({ name: 'user', rest: [] });
  });

  test('オプションが来たらコマンド名の探索を打ち切る', () => {
    expect(resolveRoute(table, ['user', '--all', 'create'])).toEqual({
      name: 'user',
      rest: ['--all', 'create'],
    });
  });

  test('一致しなければ undefined', () => {
    expect(resolveRoute(table, ['nope'])).toBeUndefined();
    expect(resolveRoute(table, [])).toBeUndefined();
  });

  test('ルートコマンドがあれば引数をそのまま渡す', () => {
    const withRoot: RouteTable = { ...table, '': load };
    expect(resolveRoute(withRoot, ['nope', '-x'])).toEqual({
      name: '',
      rest: ['nope', '-x'],
    });
    expect(resolveRoute(withRoot, [])).toEqual({ name: '', rest: [] });
  });

  test('プロトタイプ由来の名前は解決しない', () => {
    expect(resolveRoute(table, ['toString'])).toBeUndefined();
  });
});

describe('suggest', () => {
  test('打ち間違いに近いコマンドを返す', () => {
    expect(suggest(table, ['helo'])).toBe('hello');
    expect(suggest(table, ['user', 'creat'])).toBe('user/create');
  });

  test('遠すぎる場合は候補を出さない', () => {
    expect(suggest(table, ['zzzzzz'])).toBeUndefined();
  });

  test('コマンド名がなければ候補もない', () => {
    expect(suggest(table, ['--help'])).toBeUndefined();
  });
});
