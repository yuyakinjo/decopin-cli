import { describe, expect, test } from 'bun:test';

import {
  Arg,
  Argv,
  Br,
  DeclarationError,
  Line,
  Option,
  Type,
} from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import { parseArgvSpec } from '../../src/declaration/parse.ts';
import { resolveHosts } from '../../src/declaration/resolve.ts';

/** 宣言 JSX を ArgvSpec にする */
async function spec(node: RenderInput) {
  return parseArgvSpec(await resolveHosts(node));
}

describe('argv.tsx の宣言', () => {
  test('type 短縮形で位置引数とオプションを宣言できる', async () => {
    const result = await spec(
      <Argv description="Greet.">
        <Arg name="name" type="string" required description="who" />
        <Option name="loud" alias="l" type="boolean" default={false} />
      </Argv>
    );
    expect(result.description).toBe('Greet.');
    expect(result.args).toEqual([
      {
        name: 'name',
        description: 'who',
        required: true,
        defaultValue: undefined,
        variadic: false,
        type: { kind: 'string' },
      },
    ]);
    expect(result.options[0]).toMatchObject({
      name: 'loud',
      alias: 'l',
      required: false,
      defaultValue: false,
      hidden: false,
      type: { kind: 'boolean' },
    });
  });

  test('children の Type.* から制約付きの型を組める', async () => {
    const result = await spec(
      <Argv>
        <Option name="count">
          <Type.Number min={1} max={10} integer />
        </Option>
      </Argv>
    );
    expect(result.options[0]?.type).toEqual({
      kind: 'number',
      min: 1,
      max: 10,
      integer: true,
    });
  });

  test('Type.Array は入れ子で要素の型を持つ', async () => {
    const result = await spec(
      <Argv>
        <Option name="tag">
          <Type.Array minItems={1}>
            <Type.String minLength={2} />
          </Type.Array>
        </Option>
      </Argv>
    );
    expect(result.options[0]?.type).toEqual({
      kind: 'array',
      minItems: 1,
      maxItems: undefined,
      item: {
        kind: 'string',
        minLength: 2,
        maxLength: undefined,
        pattern: undefined,
        email: undefined,
        url: undefined,
      },
    });
  });

  test('共有コンポーネントを展開する', async () => {
    function CommonOptions() {
      return (
        <>
          <Option name="verbose" alias="v" type="boolean" default={false} />
          <Option name="json" type="boolean" default={false} />
        </>
      );
    }
    const result = await spec(
      <Argv>
        <Arg name="name" type="string" required />
        <CommonOptions />
      </Argv>
    );
    expect(result.options.map((option) => option.name)).toEqual([
      'verbose',
      'json',
    ]);
  });

  test('条件分岐で宣言を出し入れできる', async () => {
    const withExtra = false;
    const result = await spec(
      <Argv>
        <Option name="a" type="boolean" default={false} />
        {withExtra && <Option name="b" type="boolean" default={false} />}
      </Argv>
    );
    expect(result.options.map((option) => option.name)).toEqual(['a']);
  });
});

describe('宣言の誤りを弾く', () => {
  const cases: [string, RenderInput, RegExp][] = [
    [
      'required と default の同時指定',
      <Argv>
        <Option name="a" type="string" required default="x" />
      </Argv>,
      /cannot be both required and have a default/,
    ],
    [
      'type 短縮形と children の同時指定',
      <Argv>
        <Option name="a" type="string">
          <Type.Number />
        </Option>
      </Argv>,
      /cannot set both the "type" shorthand and a Type\.\* child/,
    ],
    [
      '型の指定なし',
      <Argv>
        <Option name="a" />
      </Argv>,
      /needs a type/,
    ],
    [
      'children に型が 2 つ',
      <Argv>
        <Option name="a">
          <Type.String />
          <Type.Number />
        </Option>
      </Argv>,
      /requires exactly one type child/,
    ],
    [
      '予約されたオプション名',
      <Argv>
        <Option name="help" type="boolean" default={false} />
      </Argv>,
      /reserved by decopin-cli/,
    ],
    [
      '予約された短縮形',
      <Argv>
        <Option name="host" alias="h" type="string" />
      </Argv>,
      /Alias "-h" is reserved/,
    ],
    [
      '2 文字以上の短縮形',
      <Argv>
        <Option name="a" alias="ab" type="string" />
      </Argv>,
      /must be a single character/,
    ],
    [
      'オプション名の重複',
      <Argv>
        <Option name="a" type="string" />
        <Option name="a" type="string" />
      </Argv>,
      /Duplicate <Option name="a">/,
    ],
    [
      '短縮形の重複',
      <Argv>
        <Option name="a" alias="x" type="string" />
        <Option name="b" alias="x" type="string" />
      </Argv>,
      /Alias "-x" is used by both/,
    ],
    [
      '必須の位置引数が省略可能の後ろ',
      <Argv>
        <Arg name="a" type="string" />
        <Arg name="b" type="string" required />
      </Argv>,
      /Declare required arguments first/,
    ],
    [
      'variadic が最後でない',
      <Argv>
        <Arg name="a" type="string" variadic />
        <Arg name="b" type="string" />
      </Argv>,
      /must be the last positional argument/,
    ],
    [
      '<Argv> の中に描画用のコンポーネント',
      <Argv>
        <Br />
      </Argv>,
      /accepts <Arg> and <Option> children only/,
    ],
    [
      '<Argv> の中の素のテキスト',
      <Argv>
        <Line>x</Line>
      </Argv>,
      /Unexpected text "x" in a declaration/,
    ],
    [
      '<Argv> で包んでいない',
      <Option name="a" type="string" />,
      /must return a single <Argv> element/,
    ],
    [
      'Type.OneOf に型が 1 つだけ',
      <Argv>
        <Option name="a">
          <Type.OneOf>
            <Type.String />
          </Type.OneOf>
        </Option>
      </Argv>,
      /requires at least two type children/,
    ],
    [
      'Type.Object に Field 以外',
      <Argv>
        <Option name="a">
          <Type.Object>
            <Type.String />
          </Type.Object>
        </Option>
      </Argv>,
      /accepts <Type.Field> children only/,
    ],
  ];

  for (const [name, node, pattern] of cases) {
    test(name, async () => {
      const promise = spec(node);
      await expect(promise).rejects.toThrow(DeclarationError);
      await expect(promise).rejects.toThrow(pattern);
    });
  }
});
