/**
 * 型宣言コンポーネント `Type.*` (src/core/components/type)。
 *
 * どの部品がどの種類として解釈されるか、入れ子 (Array / Object / Field /
 * OneOf) が宣言ツリーとしてそのまま取り出せるかを見る。valibot への変換は
 * test/core/validation/ が受け持つ
 */
import { describe, expect, test } from 'bun:test';

import { Type as PublicType } from 'decopin-cli';

import { Type } from '../../../../src/core/components/type/index.ts';
import {
  type HostNode,
  resolveHosts,
} from '../../../../src/core/jsx/resolve.ts';

/** 比べやすいように [種類, props, 子] の形に落とす */
type Shape = [string, Record<string, unknown>, Shape[]];
function shape(node: HostNode): Shape {
  return [node.kind, node.props, node.children.map(shape)];
}

describe('Type', () => {
  test('公開 API の Type と同じもの', () => {
    expect(PublicType).toBe(Type);
  });

  test('部品ごとの種類と表示名', () => {
    expect(
      Object.entries(Type).map(([key, part]) => [key, part.$host, part.name])
    ).toEqual([
      ['String', 'type.string', 'Type.String'],
      ['Number', 'type.number', 'Type.Number'],
      ['Boolean', 'type.boolean', 'Type.Boolean'],
      ['Enum', 'type.enum', 'Type.Enum'],
      ['Date', 'type.date', 'Type.Date'],
      ['Instant', 'type.instant', 'Type.Instant'],
      ['PlainDate', 'type.plainDate', 'Type.PlainDate'],
      ['Array', 'type.array', 'Type.Array'],
      ['Object', 'type.object', 'Type.Object'],
      ['Field', 'type.field', 'Type.Field'],
      ['OneOf', 'type.oneOf', 'Type.OneOf'],
      ['Custom', 'type.custom', 'Type.Custom'],
    ]);
  });

  test('制約は props としてそのまま残る', async () => {
    const nodes = await resolveHosts(
      <>
        <Type.String minLength={1} maxLength={8} pattern="^[a-z]+$" />
        <Type.Number min={0} max={10} integer />
        <Type.Enum values={['dev', 'prod']} />
        <Type.PlainDate min="2026-01-01" />
      </>
    );
    expect(nodes.map(shape)).toEqual([
      ['type.string', { minLength: 1, maxLength: 8, pattern: '^[a-z]+$' }, []],
      ['type.number', { min: 0, max: 10, integer: true }, []],
      ['type.enum', { values: ['dev', 'prod'] }, []],
      ['type.plainDate', { min: '2026-01-01' }, []],
    ]);
  });

  test('入れ子の型が木として取り出せる', async () => {
    const [root] = await resolveHosts(
      <Type.Array minItems={1}>
        <Type.Object>
          <Type.Field name="id" required>
            <Type.Number integer />
          </Type.Field>
          <Type.Field name="tag" defaultValue="none">
            <Type.OneOf>
              <Type.String />
              <Type.Boolean />
            </Type.OneOf>
          </Type.Field>
        </Type.Object>
      </Type.Array>
    );
    expect(root && shape(root)).toEqual([
      'type.array',
      { minItems: 1 },
      [
        [
          'type.object',
          {},
          [
            [
              'type.field',
              { name: 'id', required: true },
              [['type.number', { integer: true }, []]],
            ],
            [
              'type.field',
              { name: 'tag', defaultValue: 'none' },
              [
                [
                  'type.oneOf',
                  {},
                  [
                    ['type.string', {}, []],
                    ['type.boolean', {}, []],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],
    ]);
  });

  test('Custom は検査関数を props として運ぶ', async () => {
    const validate = (value: unknown) =>
      typeof value === 'string' && value.startsWith('https://');
    const [node] = await resolveHosts(
      <Type.Custom validate={validate} as="URL" message="must be https" />
    );
    expect(node?.displayName).toBe('Type.Custom');
    expect(node?.props.validate).toBe(validate);
    expect(node?.props.as).toBe('URL');
    expect(node?.props.message).toBe('must be https');
  });
});
