import { describe, expect, test } from 'bun:test';

import type { EvaluatedRoute } from '../../src/build/evaluator.ts';
import {
  generateTypes,
  stdinTypeText,
  toTypeText,
} from '../../src/build/type-emitter.ts';
import type { ArgvSpec } from '../../src/declaration/spec.ts';

describe('toTypeText', () => {
  test('基本の型', () => {
    expect(toTypeText({ kind: 'string' })).toBe('string');
    expect(toTypeText({ kind: 'number' })).toBe('number');
    expect(toTypeText({ kind: 'boolean' })).toBe('boolean');
    expect(toTypeText({ kind: 'date' })).toBe('Date');
  });

  test('enum は文字列リテラルの union', () => {
    expect(toTypeText({ kind: 'enum', values: ['a', 'b'] })).toBe('"a" | "b"');
  });

  test('array は要素の型に [] を付ける', () => {
    expect(toTypeText({ kind: 'array', item: { kind: 'string' } })).toBe(
      'string[]'
    );
  });

  test('union を配列にするときは括弧で囲む', () => {
    expect(
      toTypeText({
        kind: 'array',
        item: { kind: 'enum', values: ['a', 'b'] },
      })
    ).toBe('("a" | "b")[]');
  });

  test('object は既定値や required に応じて ? を付ける', () => {
    expect(
      toTypeText({
        kind: 'object',
        fields: [
          { name: 'id', required: true, type: { kind: 'number' } },
          { name: 'tag', required: false, type: { kind: 'string' } },
          {
            name: 'level',
            required: false,
            defaultValue: 1,
            type: { kind: 'number' },
          },
        ],
      })
    ).toBe('{ id: number; tag?: string; level: number }');
  });

  test('識別子にできないキーは引用符で囲む', () => {
    expect(
      toTypeText({
        kind: 'object',
        fields: [
          { name: 'content-type', required: true, type: { kind: 'string' } },
        ],
      })
    ).toBe('{ "content-type": string }');
  });

  test('oneOf は union', () => {
    expect(
      toTypeText({
        kind: 'oneOf',
        options: [{ kind: 'string' }, { kind: 'number' }],
      })
    ).toBe('string | number');
  });

  test('custom は as で宣言された型', () => {
    expect(
      toTypeText({
        kind: 'custom',
        validate: () => true,
        as: 'number',
        coerceAs: 'number',
      })
    ).toBe('number');
  });

  test('custom の as は任意の型名を書ける', () => {
    expect(
      toTypeText({
        kind: 'custom',
        validate: () => true,
        as: 'URL',
        coerceAs: 'none',
      })
    ).toBe('URL');
  });

  test('custom の as を省略すると unknown', () => {
    expect(
      toTypeText({ kind: 'custom', validate: () => true, coerceAs: 'none' })
    ).toBe('unknown');
  });
});

function evaluated(name: string, spec: ArgvSpec): EvaluatedRoute {
  return { route: { name, dir: name, files: {} }, spec };
}

describe('stdinTypeText', () => {
  test('stdin.tsx が無ければ never', () => {
    expect(stdinTypeText(undefined)).toBe('never');
  });

  test('required なら undefined が付かない', () => {
    expect(stdinTypeText({ mode: 'text', required: true, trim: false })).toBe(
      'string'
    );
    expect(stdinTypeText({ mode: 'lines', required: true, trim: false })).toBe(
      'string[]'
    );
  });

  test('required でなければ undefined が付く (端末実行時に渡らない)', () => {
    expect(stdinTypeText({ mode: 'text', required: false, trim: false })).toBe(
      'string | undefined'
    );
  });

  test('mode="json" は構造の宣言があればその型、無ければ unknown', () => {
    expect(stdinTypeText({ mode: 'json', required: true, trim: false })).toBe(
      'unknown'
    );
    expect(
      stdinTypeText({
        mode: 'json',
        required: true,
        trim: false,
        type: { kind: 'array', item: { kind: 'string' } },
      })
    ).toBe('string[]');
  });
});

describe('generateTypes', () => {
  test('Routes を module augmentation で埋める', () => {
    const code = generateTypes([
      evaluated('hello', {
        args: [
          {
            name: 'name',
            required: false,
            defaultValue: 'world',
            variadic: false,
            type: { kind: 'string' },
          },
        ],
        options: [
          {
            name: 'loud',
            required: false,
            defaultValue: false,
            hidden: false,
            type: { kind: 'boolean' },
          },
        ],
      }),
    ]);
    expect(code).toContain("declare module 'decopin-cli'");
    expect(code).toContain('interface Routes {');
    expect(code).toContain(
      '"hello": { args: { name: string }; options: { loud: boolean }; stdin: never };'
    );
  });

  test('既定値も required も無いキーは省略可能にする', () => {
    const code = generateTypes([
      evaluated('x', {
        args: [],
        options: [
          {
            name: 'tag',
            required: false,
            hidden: false,
            type: { kind: 'array', item: { kind: 'string' } },
          },
        ],
      }),
    ]);
    expect(code).toContain('options: { tag?: string[] }');
  });

  test('required は必ず存在するキーになる', () => {
    const code = generateTypes([
      evaluated('x', {
        args: [],
        options: [
          {
            name: 'token',
            required: true,
            hidden: false,
            type: { kind: 'string' },
          },
        ],
      }),
    ]);
    expect(code).toContain('options: { token: string }');
  });

  test('variadic は配列になる', () => {
    const code = generateTypes([
      evaluated('x', {
        args: [
          {
            name: 'files',
            required: true,
            variadic: true,
            type: { kind: 'string' },
          },
        ],
        options: [],
      }),
    ]);
    expect(code).toContain('args: { files: string[] }');
  });

  test('宣言がなければ空のオブジェクトになる', () => {
    const code = generateTypes([evaluated('x', { args: [], options: [] })]);
    expect(code).toContain('"x": { args: {}; options: {}; stdin: never };');
  });

  test('stdin.tsx の宣言を型に反映する', () => {
    const code = generateTypes([
      {
        route: { name: 'count', dir: 'count', files: {} },
        spec: { args: [], options: [] },
        stdin: { mode: 'lines', required: true, trim: false },
      },
    ]);
    expect(code).toContain('stdin: string[] };');
  });

  test('ルートコマンドは空文字のキーになる', () => {
    const code = generateTypes([evaluated('', { args: [], options: [] })]);
    expect(code).toContain('"": {');
  });
});
