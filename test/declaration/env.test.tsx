import { describe, expect, test } from 'bun:test';

import { DeclarationError, Env, Type, Var, Version } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import { parseEnvSpec, parseVersionSpec } from '../../src/declaration/parse.ts';
import { resolveHosts } from '../../src/declaration/resolve.ts';

async function env(node: RenderInput) {
  return parseEnvSpec(await resolveHosts(node));
}

async function version(node: RenderInput) {
  return parseVersionSpec(await resolveHosts(node));
}

describe('env.tsx の宣言', () => {
  test('type 短縮形と children のどちらでも書ける', async () => {
    const result = await env(
      <Env>
        <Var name="TOKEN" type="string" required description="api token" />
        <Var name="LEVEL" default="info">
          <Type.Enum values={['debug', 'info']} />
        </Var>
      </Env>
    );
    expect(result.vars).toEqual([
      {
        name: 'TOKEN',
        description: 'api token',
        required: true,
        defaultValue: undefined,
        type: { kind: 'string' },
      },
      {
        name: 'LEVEL',
        description: undefined,
        required: false,
        defaultValue: 'info',
        type: { kind: 'enum', values: ['debug', 'info'] },
      },
    ]);
  });

  const cases: [string, RenderInput, RegExp][] = [
    [
      '<Env> で包んでいない',
      <Var name="A" type="string" />,
      /must return a single <Env> element/,
    ],
    ['<Var> が無い', <Env />, /requires at least one <Var>/],
    [
      '<Var> 以外の子',
      <Env>
        <Version version="1.0.0" />
      </Env>,
      /accepts <Var> children only/,
    ],
    [
      '名前の重複',
      <Env>
        <Var name="A" type="string" />
        <Var name="A" type="string" />
      </Env>,
      /Duplicate <Var name="A">/,
    ],
    [
      'required と default の同時指定',
      <Env>
        <Var name="A" type="string" required default="x" />
      </Env>,
      /cannot be both required and have a default/,
    ],
    [
      '型の指定なし',
      <Env>
        <Var name="A" />
      </Env>,
      /needs a type/,
    ],
  ];

  for (const [name, node, pattern] of cases) {
    test(name, async () => {
      const promise = env(node);
      await expect(promise).rejects.toThrow(DeclarationError);
      await expect(promise).rejects.toThrow(pattern);
    });
  }
});

describe('version.tsx の宣言', () => {
  test('version だけ', async () => {
    expect(await version(<Version version="1.2.3" />)).toEqual({
      version: '1.2.3',
      name: undefined,
    });
  });

  test('name も付けられる', async () => {
    expect(await version(<Version name="mycli" version="1.2.3" />)).toEqual({
      version: '1.2.3',
      name: 'mycli',
    });
  });

  test('version は必須', async () => {
    await expect(
      version(<Version version={undefined as unknown as string} />)
    ).rejects.toThrow(/<Version version> is required/);
  });

  test('<Version> で包んでいない', async () => {
    await expect(env(<Version version="1.0.0" />)).rejects.toThrow(
      /must return a single <Env> element/
    );
  });
});
