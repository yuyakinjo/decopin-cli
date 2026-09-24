/**
 * 入力宣言コンポーネントの互換 façade (src/core/components/input)。
 *
 * 実装は feature ディレクトリにあり、ここは再輸出するだけ。façade から
 * 取ったものが実装と同じ実体であること、宣言ツリーとして解釈できることを見る
 */
import { describe, expect, test } from 'bun:test';

import * as publicApi from 'decopin-cli';

import {
  Arg,
  Argv,
  Env,
  Option,
  Output,
  Stdin,
  Var,
  Version,
} from '../../../../src/core/components/input/index.ts';
import { Type } from '../../../../src/core/components/type/index.ts';
import { resolveHosts } from '../../../../src/core/jsx/resolve.ts';
import * as argv from '../../../../src/features/conventions/argv/components.ts';
import * as output from '../../../../src/features/conventions/output/components.ts';
import * as stdin from '../../../../src/features/conventions/stdin/components.ts';
import * as env from '../../../../src/features/root-only/env/components.ts';
import * as version from '../../../../src/features/root-only/version/components.ts';

describe('再輸出', () => {
  test('façade の部品は feature の実装と同じ実体', () => {
    expect(Argv).toBe(argv.Argv);
    expect(Arg).toBe(argv.Arg);
    expect(Option).toBe(argv.Option);
    expect(Output).toBe(output.Output);
    expect(Stdin).toBe(stdin.Stdin);
    expect(Env).toBe(env.Env);
    expect(Var).toBe(env.Var);
    expect(Version).toBe(version.Version);
  });

  test('公開 API (decopin-cli) からも同じ実体が取れる', () => {
    expect(publicApi.Argv).toBe(Argv);
    expect(publicApi.Option).toBe(Option);
    expect(publicApi.Env).toBe(Env);
  });

  test('種類はそれぞれの宣言の名前', () => {
    expect(
      [Argv, Arg, Option, Output, Stdin, Env, Var, Version].map((c) => c.$host)
    ).toEqual([
      'argv',
      'arg',
      'option',
      'output',
      'stdin',
      'env',
      'var',
      'version',
    ]);
  });
});

describe('宣言ツリーとしての解釈', () => {
  test('Argv の下の Arg / Option が、children を除いた props ごと木になる', async () => {
    const nodes = await resolveHosts(
      <Argv description="Greet">
        <Arg name="name" type="string" default="world" />
        <Option name="loud" type="boolean" alias="l" />
      </Argv>
    );
    expect(nodes).toEqual([
      {
        kind: 'argv',
        displayName: 'Argv',
        props: { description: 'Greet' },
        children: [
          {
            kind: 'arg',
            displayName: 'Arg',
            props: { name: 'name', type: 'string', default: 'world' },
            children: [],
          },
          {
            kind: 'option',
            displayName: 'Option',
            props: { name: 'loud', type: 'boolean', alias: 'l' },
            children: [],
          },
        ],
      },
    ]);
  });

  test('Env / Var は Type を子に持てる', async () => {
    const [root] = await resolveHosts(
      <Env>
        <Var name="TOKEN">
          <Type.String minLength={1} />
        </Var>
      </Env>
    );
    expect(root?.kind).toBe('env');
    const [variable] = root?.children ?? [];
    expect(variable?.props).toEqual({ name: 'TOKEN' });
    expect(variable?.children.map((c) => [c.kind, c.props])).toEqual([
      ['type.string', { minLength: 1 }],
    ]);
  });
});
