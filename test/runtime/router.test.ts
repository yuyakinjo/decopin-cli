import { describe, expect, test } from 'bun:test';

import {
  commandsUnder,
  resolveRoute,
  resolveTarget,
  suggest,
} from '../../src/runtime/router.ts';
import type { RouteTable } from '../../src/runtime/router.ts';

const load = { command: async () => ({ default: () => null }) };

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

describe('resolveTarget', () => {
  test('コマンドに一致すれば command', () => {
    expect(resolveTarget(table, ['user', 'create', 'x'])).toEqual({
      kind: 'command',
      name: 'user/create',
      rest: ['x'],
    });
  });

  test('語が 0 個なら root', () => {
    expect(resolveTarget(table, [])).toEqual({ kind: 'root' });
    expect(resolveTarget(table, ['--help'])).toEqual({ kind: 'root' });
  });

  test('command.tsx を持たないディレクトリは group', () => {
    const withoutParent: RouteTable = {
      'user/create': load,
      'user/list': load,
    };
    expect(resolveTarget(withoutParent, ['user'])).toEqual({
      kind: 'group',
      name: 'user',
    });
  });

  test('command.tsx を持つディレクトリは group ではなく command', () => {
    expect(resolveTarget(table, ['user'])).toEqual({
      kind: 'command',
      name: 'user',
      rest: [],
    });
  });

  test('グループの下の未知の語は unknown', () => {
    const withoutParent: RouteTable = { 'user/create': load };
    expect(resolveTarget(withoutParent, ['user', 'zzzzzzzz'])).toEqual({
      kind: 'unknown',
      requested: 'user zzzzzzzz',
      suggestion: undefined,
    });
  });

  test('グループの下でも近い候補は提案する', () => {
    const withoutParent: RouteTable = { 'user/create': load };
    expect(resolveTarget(withoutParent, ['user', 'creat'])).toMatchObject({
      kind: 'unknown',
      suggestion: 'user/create',
    });
  });

  test('近いコマンドがあれば候補を付ける', () => {
    expect(resolveTarget(table, ['helo'])).toEqual({
      kind: 'unknown',
      requested: 'helo',
      suggestion: 'hello',
    });
  });

  test('ルートコマンドがあれば group / unknown より優先する', () => {
    const withRoot: RouteTable = { ...table, '': load };
    expect(resolveTarget(withRoot, ['nope'])).toEqual({
      kind: 'command',
      name: '',
      rest: ['nope'],
    });
  });
});

describe('commandsUnder', () => {
  test('グループ配下だけを昇順で返す', () => {
    expect(commandsUnder(table, 'user')).toEqual(['user/create', 'user/list']);
  });

  test('空文字なら全部 (ルートコマンドは除く)', () => {
    const withRoot: RouteTable = { ...table, '': load };
    expect(commandsUnder(withRoot, '')).toEqual([
      'hello',
      'user',
      'user/create',
      'user/list',
    ]);
  });
});
