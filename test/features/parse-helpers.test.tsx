/**
 * `src/features/parse-helpers.ts` の単体テスト。
 *
 * argv / env / stdin / output の宣言パーサーが共有する部品 (props の読み取り、
 * `Type.*` → TypeNode の変換、type 短縮形の解決、required と default の排他)
 * を、HostNode を直に渡して確かめる。
 */
import { describe, expect, test } from 'bun:test';

import { Type } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import { DeclarationError } from '../../src/core/errors.ts';
import type { HostNode } from '../../src/core/jsx/resolve.ts';
import { resolveHosts } from '../../src/core/jsx/resolve.ts';
import {
  onlyType,
  presence,
  readBoolean,
  readNumber,
  readString,
  rejectObjectFor,
  requireName,
  resolveType,
  toTypeNode,
} from '../../src/features/parse-helpers.ts';

/** JSX の型宣言を 1 つの HostNode にする */
async function hostOf(node: RenderInput): Promise<HostNode> {
  const [host] = await resolveHosts(node);
  return host as HostNode;
}

/** 型の検査をすり抜けた props を作るための素の HostNode */
function node(
  props: Record<string, unknown>,
  children: HostNode[] = [],
  kind = 'option'
): HostNode {
  return {
    kind: kind as HostNode['kind'],
    props,
    children,
    displayName: 'Option',
  };
}

describe('readNumber / readBoolean / readString', () => {
  test('無ければ undefined、型が合えばその値', () => {
    expect(readNumber(node({}), 'min')).toBeUndefined();
    expect(readNumber(node({ min: 3 }), 'min')).toBe(3);
    expect(readBoolean(node({ loud: false }), 'loud')).toBe(false);
    expect(readString(node({ name: 'x' }), 'name')).toBe('x');
  });

  test('型が違えば、要素名と prop 名と受け取った型を添えて投げる', () => {
    expect(() => readNumber(node({ min: '3' }), 'min')).toThrow(
      '<Option min> requires a number, received string'
    );
    expect(() => readBoolean(node({ loud: 1 }), 'loud')).toThrow(
      '<Option loud> requires a boolean, received number'
    );
    expect(() => readString(node({ name: true }), 'name')).toThrow(
      '<Option name> requires a string, received boolean'
    );
  });

  test('投げるのは DeclarationError (ビルド時の宣言の誤り)', () => {
    expect(() => readNumber(node({ min: null }), 'min')).toThrow(
      DeclarationError
    );
  });
});

describe('toTypeNode', () => {
  test('Type.String は制約をそのまま写す', async () => {
    expect(
      toTypeNode(await hostOf(<Type.String minLength={1} pattern="^a" email />))
    ).toEqual({
      kind: 'string',
      minLength: 1,
      maxLength: undefined,
      pattern: '^a',
      email: true,
      url: undefined,
    });
  });

  test('Type.Array は中身の型を 1 つだけ取る', async () => {
    const type = toTypeNode(
      await hostOf(
        <Type.Array maxItems={3}>
          <Type.Enum values={['a', 'b']} />
        </Type.Array>
      )
    );
    expect(type).toEqual({
      kind: 'array',
      item: { kind: 'enum', values: ['a', 'b'] },
      minItems: undefined,
      maxItems: 3,
    });
  });

  test('Type.Object はフィールドの required / defaultValue を読む', async () => {
    const type = toTypeNode(
      await hostOf(
        <Type.Object>
          <Type.Field name="id" required>
            <Type.Number integer />
          </Type.Field>
          <Type.Field name="tag" defaultValue="none">
            <Type.String />
          </Type.Field>
        </Type.Object>
      )
    );
    expect(type.kind).toBe('object');
    if (type.kind !== 'object') return;
    expect(
      type.fields.map(({ name, required, defaultValue, type: t }) => [
        name,
        required,
        defaultValue,
        t.kind,
      ])
    ).toEqual([
      ['id', true, undefined, 'number'],
      ['tag', false, 'none', 'string'],
    ]);
  });

  test('Type.OneOf は選択肢を順に並べる', async () => {
    const type = toTypeNode(
      await hostOf(
        <Type.OneOf>
          <Type.Number />
          <Type.Boolean />
        </Type.OneOf>
      )
    );
    expect(type).toMatchObject({
      kind: 'oneOf',
      options: [{ kind: 'number' }, { kind: 'boolean' }],
    });
  });

  test('Type.Custom の as は primitive のときだけ argv の変換に使う', async () => {
    const validate = (value: unknown) => value === 'ok';
    const primitive = toTypeNode(
      await hostOf(<Type.Custom validate={validate} as="number" />)
    );
    expect(primitive).toMatchObject({ kind: 'custom', coerceAs: 'number' });
    const named = toTypeNode(
      await hostOf(<Type.Custom validate={validate} as="Semver" />)
    );
    expect(named).toMatchObject({ as: 'Semver', coerceAs: 'none' });
  });

  test('Type.PlainDate の境界はビルド時に Temporal として読めるか確かめる', async () => {
    expect(
      toTypeNode(await hostOf(<Type.PlainDate min="2026-01-01" />))
    ).toEqual({ kind: 'plainDate', min: '2026-01-01', max: undefined });
    const invalid = await hostOf(<Type.PlainDate max="2026-13-40" />);
    expect(() => toTypeNode(invalid)).toThrow(
      '<Type.PlainDate max="2026-13-40"> is not a Temporal.PlainDate'
    );
  });

  const broken: [string, RenderInput, string][] = [
    [
      '空の Enum',
      <Type.Enum values={[]} />,
      '<Type.Enum values> requires a non-empty array of strings',
    ],
    [
      'フィールドの無い Object',
      <Type.Object>{null}</Type.Object>,
      '<Type.Object> requires at least one <Type.Field>',
    ],
    [
      '選択肢が 1 つの OneOf',
      <Type.OneOf>
        <Type.String />
      </Type.OneOf>,
      '<Type.OneOf> requires at least two type children',
    ],
    [
      'Object の外の Field',
      <Type.Field name="x">
        <Type.String />
      </Type.Field>,
      '<Type.Field> can only appear inside <Type.Object>',
    ],
    [
      '中身の型が 2 つある Array',
      <Type.Array>
        <Type.String />
        <Type.Number />
      </Type.Array>,
      '<Type.Array> requires exactly one type child, found 2',
    ],
  ];
  for (const [label, input, message] of broken) {
    test(`壊れた宣言は投げる: ${label}`, async () => {
      const host = await hostOf(input);
      expect(() => toTypeNode(host)).toThrow(message);
    });
  }

  test('型でない要素は Type.* を使うよう促す', () => {
    expect(() => toTypeNode(node({}))).toThrow(
      '<Option> is not a type. Use Type.* components here'
    );
  });
});

describe('rejectObjectFor', () => {
  const object = {
    kind: 'object' as const,
    fields: [
      {
        name: 'a',
        required: false,
        defaultValue: undefined,
        type: { kind: 'string' as const },
      },
    ],
  };

  test('stdin は Object を受け付ける', () => {
    expect(() => rejectObjectFor('stdin', object)).not.toThrow();
  });

  test('argv / env は Array や OneOf の奥に隠れた Object も弾く', () => {
    expect(() =>
      rejectObjectFor('argv', { kind: 'array', item: object })
    ).toThrow('<Type.Object> cannot be used for argv');
    expect(() =>
      rejectObjectFor('env', {
        kind: 'oneOf',
        options: [{ kind: 'string' }, object],
      })
    ).toThrow('<Type.Object> cannot be used for env');
  });

  test('Object を含まない型はそのまま通す', () => {
    expect(() =>
      rejectObjectFor('argv', { kind: 'array', item: { kind: 'number' } })
    ).not.toThrow();
  });
});

describe('resolveType', () => {
  test('type 短縮形はその primitive になる', () => {
    expect(resolveType(node({ name: 'n', type: 'number' }), 'argv')).toEqual({
      kind: 'number',
    });
  });

  test('children があればその型になる', async () => {
    const child = await hostOf(<Type.Boolean />);
    expect(resolveType(node({ name: 'n' }, [child]), 'env')).toEqual({
      kind: 'boolean',
    });
  });

  test('短縮形と children の両方、あるいはどちらも無いのは誤り', async () => {
    const child = await hostOf(<Type.String />);
    expect(() =>
      resolveType(node({ name: 'n', type: 'string' }, [child]), 'argv')
    ).toThrow('cannot set both the "type" shorthand and a Type.* child');
    expect(() => resolveType(node({ name: 'n' }), 'argv')).toThrow(
      '<Option name="n"> needs a type'
    );
  });

  test('短縮形は string / number / boolean だけ', () => {
    expect(() =>
      resolveType(node({ name: 'n', type: 'date' }), 'argv')
    ).toThrow('<Option type> must be "string", "number", or "boolean"');
  });

  test('argv の children に Object を書けばビルド時に弾く', async () => {
    const child = await hostOf(
      <Type.Object>
        <Type.Field name="a">
          <Type.String />
        </Type.Field>
      </Type.Object>
    );
    expect(() => resolveType(node({ name: 'n' }, [child]), 'argv')).toThrow(
      'declare the structure in stdin.tsx instead'
    );
  });
});

describe('requireName / presence', () => {
  test('name は空文字も欠落として扱う', () => {
    expect(requireName(node({ name: 'target' }))).toBe('target');
    expect(() => requireName(node({ name: '' }))).toThrow(
      '<Option name> is required'
    );
    expect(() => requireName(node({}))).toThrow('<Option name> is required');
  });

  test('required と default はどちらか一方だけ', () => {
    expect(presence(node({ required: true }), 'n')).toEqual({
      required: true,
      defaultValue: undefined,
    });
    expect(presence(node({ default: 0 }), 'n')).toEqual({
      required: false,
      defaultValue: 0,
    });
    expect(() => presence(node({ required: true, default: 'x' }), 'n')).toThrow(
      '<Option name="n"> cannot be both required and have a default'
    );
  });
});

describe('onlyType', () => {
  test('子が無ければ、見つかった数 0 を添えて投げる', () => {
    expect(() => onlyType(node({}))).toThrow(
      '<Option> requires exactly one type child, found 0'
    );
  });
});
