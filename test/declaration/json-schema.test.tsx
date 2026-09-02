/**
 * TypeNode → JSON Schema (ADR 33)。
 *
 * valibot / 型テキスト / help と同じ木から導くので、ここで見るのは
 * 「宣言にある制約だけが写り、無い制約を発明しない」こと。
 */
import { describe, expect, test } from 'bun:test';

import {
  Arg,
  Argv,
  argumentsSchema,
  Option,
  Stdin,
  toJsonSchema,
  Type,
} from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import { parseArgvSpec, parseStdinSpec } from '../../src/declaration/parse.ts';
import { resolveHosts } from '../../src/declaration/resolve.ts';

async function argv(node: RenderInput) {
  return parseArgvSpec(await resolveHosts(node));
}

async function stdin(node: RenderInput) {
  return parseStdinSpec(await resolveHosts(node));
}

describe('toJsonSchema', () => {
  test('primitive と制約', () => {
    expect(toJsonSchema({ kind: 'string' })).toEqual({ type: 'string' });
    expect(
      toJsonSchema({ kind: 'string', minLength: 1, maxLength: 3, email: true })
    ).toEqual({ type: 'string', minLength: 1, maxLength: 3, format: 'email' });
    expect(toJsonSchema({ kind: 'number', min: 0, max: 10 })).toEqual({
      type: 'number',
      minimum: 0,
      maximum: 10,
    });
    expect(toJsonSchema({ kind: 'number', integer: true })).toEqual({
      type: 'integer',
    });
    expect(toJsonSchema({ kind: 'boolean' })).toEqual({ type: 'boolean' });
    expect(toJsonSchema({ kind: 'enum', values: ['a', 'b'] })).toEqual({
      type: 'string',
      enum: ['a', 'b'],
    });
  });

  test('日時は ISO 8601 の文字列として外に見せる', () => {
    expect(toJsonSchema({ kind: 'instant' })).toEqual({
      type: 'string',
      format: 'date-time',
    });
    expect(toJsonSchema({ kind: 'plainDate' })).toEqual({
      type: 'string',
      format: 'date',
    });
  });

  test('array / object / oneOf は入れ子で辿る', () => {
    expect(
      toJsonSchema({
        kind: 'array',
        item: { kind: 'string' },
        minItems: 1,
      })
    ).toEqual({ type: 'array', items: { type: 'string' }, minItems: 1 });
    expect(
      toJsonSchema({
        kind: 'object',
        fields: [
          { name: 'id', required: true, type: { kind: 'number' } },
          {
            name: 'tag',
            required: false,
            defaultValue: 'x',
            type: { kind: 'string' },
          },
        ],
      })
    ).toEqual({
      type: 'object',
      properties: {
        id: { type: 'number' },
        tag: { type: 'string', default: 'x' },
      },
      required: ['id'],
    });
    expect(
      toJsonSchema({
        kind: 'oneOf',
        options: [{ kind: 'number' }, { kind: 'boolean' }],
      })
    ).toEqual({ anyOf: [{ type: 'number' }, { type: 'boolean' }] });
  });

  test('custom は as が primitive のときだけ型を出し、それ以外は何でも通す', () => {
    expect(
      toJsonSchema({
        kind: 'custom',
        validate: () => true,
        as: 'number',
        coerceAs: 'number',
        message: 'must be even',
      })
    ).toEqual({ type: 'number', description: 'must be even' });
    expect(
      toJsonSchema({
        kind: 'custom',
        validate: () => true,
        as: 'URL',
        coerceAs: 'none',
      })
    ).toEqual({});
  });
});

describe('argumentsSchema', () => {
  test('位置引数もオプションも 1 つのオブジェクトの項目になる', async () => {
    const spec = await argv(
      <Argv description="Deploy.">
        <Arg name="target" type="string" required description="what" />
        <Arg name="extra" variadic>
          <Type.String />
        </Arg>
        <Option name="env" alias="e" default="dev" description="where">
          <Type.Enum values={['dev', 'prod']} />
        </Option>
        <Option name="force" type="boolean" default={false} />
        <Option name="token" type="string" default="" hidden />
      </Argv>
    );
    expect(argumentsSchema(spec)).toEqual({
      type: 'object',
      properties: {
        target: { type: 'string', description: 'what' },
        extra: { type: 'array', items: { type: 'string' } },
        env: {
          type: 'string',
          enum: ['dev', 'prod'],
          description: 'where',
          default: 'dev',
        },
        force: { type: 'boolean', default: false },
      },
      required: ['target'],
      additionalProperties: false,
    });
  });

  test('hidden なオプションは help と同じく外に出さない', async () => {
    const spec = await argv(
      <Argv>
        <Option name="token" type="string" default="" hidden />
      </Argv>
    );
    expect(argumentsSchema(spec)).toEqual({
      type: 'object',
      properties: {},
      additionalProperties: false,
    });
  });

  test('stdin.tsx があれば、パイプの中身を stdin 引数で受ける', async () => {
    const spec = await argv(<Argv />);
    const text = await stdin(<Stdin mode="lines" required />);
    expect(argumentsSchema(spec, text)).toEqual({
      type: 'object',
      properties: {
        stdin: {
          type: 'string',
          description:
            'What would be piped to standard input, one item per line',
        },
      },
      required: ['stdin'],
      additionalProperties: false,
    });

    const json = await stdin(
      <Stdin mode="json">
        <Type.Object>
          <Type.Field name="name" required>
            <Type.String />
          </Type.Field>
        </Type.Object>
      </Stdin>
    );
    expect(argumentsSchema(spec, json).properties?.stdin).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      description: 'What would be piped to standard input',
    });
  });
});
