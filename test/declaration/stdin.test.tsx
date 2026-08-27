import { describe, expect, test } from 'bun:test';

import { DeclarationError, Stdin, Type } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';
import * as v from 'valibot';

import { parseStdinSpec } from '../../src/declaration/parse.ts';
import { resolveHosts } from '../../src/declaration/resolve.ts';

async function spec(node: RenderInput) {
  return parseStdinSpec(await resolveHosts(node));
}

describe('stdin.tsx の宣言', () => {
  test('mode だけの最小の宣言', async () => {
    expect(await spec(<Stdin mode="text" />)).toEqual({
      mode: 'text',
      required: false,
      trim: false,
      type: undefined,
    });
  });

  test('required と trim', async () => {
    expect(await spec(<Stdin mode="text" required trim />)).toEqual({
      mode: 'text',
      required: true,
      trim: true,
      type: undefined,
    });
  });

  test('mode="json" は children で構造を宣言できる', async () => {
    const result = await spec(
      <Stdin mode="json" required>
        <Type.Array minItems={1}>
          <Type.Object>
            <Type.Field name="id" required>
              <Type.Number integer />
            </Type.Field>
          </Type.Object>
        </Type.Array>
      </Stdin>
    );
    expect(result.type).toEqual({
      kind: 'array',
      minItems: 1,
      maxItems: undefined,
      item: {
        kind: 'object',
        fields: [
          {
            name: 'id',
            required: true,
            defaultValue: undefined,
            type: {
              kind: 'number',
              min: undefined,
              max: undefined,
              integer: true,
            },
          },
        ],
      },
    });
  });
});

describe('schema エスケープハッチ (§4.8)', () => {
  test('valibot スキーマをそのまま持てる', async () => {
    const schema = v.object({ id: v.number() });
    const result = await spec(<Stdin mode="json" required schema={schema} />);
    expect(result.schema).toBe(schema);
    expect(result.type).toBeUndefined();
  });

  const cases: [string, RenderInput, RegExp][] = [
    [
      'children との併用',
      <Stdin mode="json" schema={v.string()}>
        <Type.String />
      </Stdin>,
      /cannot set both the "schema" prop and a Type\.\* child/,
    ],
    [
      'mode="text" で schema',
      <Stdin mode="text" schema={v.string()} />,
      /cannot take a "schema" prop/,
    ],
    [
      'スキーマでない値',
      <Stdin mode="json" schema={{ id: 1 }} />,
      /requires a valibot schema/,
    ],
    [
      'async なスキーマ',
      <Stdin
        mode="json"
        schema={v.pipeAsync(
          v.string(),
          v.checkAsync(async () => true)
        )}
      />,
      /cannot take an async schema/,
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

describe('stdin.tsx の誤りを弾く', () => {
  const cases: [string, RenderInput, RegExp][] = [
    [
      'mode が無い',
      <Stdin mode={undefined as unknown as 'text'} />,
      /<Stdin mode> must be "text", "lines", or "json"/,
    ],
    [
      'mode が知らない値',
      <Stdin mode={'binary' as unknown as 'text'} />,
      /<Stdin mode> must be/,
    ],
    [
      'mode="text" に children',
      <Stdin mode="text">
        <Type.String />
      </Stdin>,
      /takes no children/,
    ],
    [
      'mode="lines" に children',
      <Stdin mode="lines">
        <Type.String />
      </Stdin>,
      /takes no children/,
    ],
    [
      'children に型が 2 つ',
      <Stdin mode="json">
        <Type.String />
        <Type.Number />
      </Stdin>,
      /requires exactly one type child/,
    ],
    [
      '<Stdin> で包んでいない',
      <Type.String />,
      /must return a single <Stdin> element/,
    ],
    [
      '<Stdin> が 2 つ',
      <>
        <Stdin mode="text" />
        <Stdin mode="lines" />
      </>,
      /must return a single <Stdin> element/,
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
