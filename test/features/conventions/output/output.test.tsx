/**
 * `output/` (output.tsx。ADR 28) の単体テスト。
 *
 * `<Output>` の宣言 → OutputSpec のパース (`parseOutputSpec`)、
 * ビルド時の評価で誤りを投げずに集める `evaluateOutput`、
 * 実行時に data.tsx の戻り値を宣言どおりか検証する `validateData` を見る。
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliError, EXIT_CODE, Output, Type } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';
import * as v from 'valibot';

import { resolveHosts } from '../../../../src/core/jsx/resolve.ts';
import { evaluateOutput } from '../../../../src/features/conventions/output/evaluate.ts';
import { parseOutputSpec } from '../../../../src/features/conventions/output/parse.ts';
import {
  loadOutputSpec,
  validateData,
} from '../../../../src/features/conventions/output/runtime.ts';

async function spec(node: RenderInput) {
  return parseOutputSpec(await resolveHosts(node));
}

function loader(value: unknown) {
  return async () => ({ default: value });
}

const userOutput = () => (
  <Output>
    <Type.Object>
      <Type.Field name="id" required>
        <Type.Number integer />
      </Type.Field>
      <Type.Field name="name" required>
        <Type.String minLength={1} />
      </Type.Field>
    </Type.Object>
  </Output>
);

describe('parseOutputSpec', () => {
  test('Type.* の子は type になる', async () => {
    expect(
      await spec(
        <Output>
          <Type.Array>
            <Type.String />
          </Type.Array>
        </Output>
      )
    ).toEqual({
      type: {
        kind: 'array',
        item: {
          kind: 'string',
          minLength: undefined,
          maxLength: undefined,
          pattern: undefined,
          email: undefined,
          url: undefined,
        },
        minItems: undefined,
        maxItems: undefined,
      },
    });
  });

  test('schema に渡した valibot スキーマはそのまま持つ', async () => {
    const schema = v.object({ id: v.number() });
    const result = await spec(<Output schema={schema} />);
    expect(result.schema).toBe(schema);
    expect(result.type).toBeUndefined();
  });

  const broken: [string, RenderInput, string][] = [
    [
      'schema と children の併用',
      <Output schema={v.string()}>
        <Type.String />
      </Output>,
      '<Output> cannot set both the "schema" prop and a Type.* child',
    ],
    [
      'valibot でない schema',
      <Output schema={{ type: 'string' }} />,
      '<Output schema> requires a valibot schema',
    ],
    [
      '非同期のスキーマ',
      <Output
        schema={v.pipeAsync(
          v.string(),
          v.checkAsync(async () => true)
        )}
      />,
      '<Output schema> cannot take an async schema',
    ],
    [
      '形の宣言が無い',
      <Output />,
      '<Output> needs a Type.* child or a "schema" prop',
    ],
    [
      '<Output> 以外を返す',
      <Type.String />,
      'output.tsx must return a single <Output> element',
    ],
    [
      '<Output> を 2 つ返す',
      <>
        <Output schema={v.string()} />
        <Output schema={v.string()} />
      </>,
      'output.tsx must return a single <Output> element',
    ],
  ];
  for (const [label, input, message] of broken) {
    test(`誤り: ${label}`, async () => {
      await expect(spec(input)).rejects.toThrow(message);
    });
  }
});

describe('loadOutputSpec', () => {
  test('output.tsx が無ければ undefined', async () => {
    expect(await loadOutputSpec(undefined)).toBeUndefined();
  });

  test('default export を呼んで宣言を組み立てる', async () => {
    const result = await loadOutputSpec(loader(userOutput));
    expect(result?.type?.kind).toBe('object');
  });

  test('default export が関数でなければ CliError。差し替えも効く', async () => {
    await expect(loadOutputSpec(loader('nope'))).rejects.toThrow(
      'Output must default-export a function that returns <Output>'
    );
    await expect(
      loadOutputSpec(loader('nope'), () => new Error('custom'))
    ).rejects.toThrow('custom');
  });
});

describe('validateData', () => {
  test('output.tsx が無ければ data をそのまま返す (検証しない)', async () => {
    const data = { anything: true };
    expect(await validateData(undefined, data)).toBe(data);
  });

  test('宣言どおりの data は通す', async () => {
    expect(
      await validateData(loader(userOutput), { id: 1, name: 'ada' })
    ).toEqual({ id: 1, name: 'ada' });
  });

  test('schema の変換結果が返り値になる', async () => {
    const schema = v.pipe(v.string(), v.trim(), v.toUpperCase());
    const output = () => <Output schema={schema} />;
    expect(await validateData(loader(output), '  ok  ')).toBe('OK');
  });

  test('宣言と違えば validation の CliError で、実行時の終了コードになる', async () => {
    const error = await validateData(loader(userOutput), {
      id: 1.5,
      name: '',
    }).catch((e) => e);
    expect(error).toBeInstanceOf(CliError);
    expect(error).toMatchObject({
      message: 'data does not match output.tsx',
      kind: 'validation',
      exitCode: EXIT_CODE.runtime,
    });
    // 食い違いは 1 つずつ issues に積まれる (id の整数、name の最短長)
    expect((error as CliError).issues).toHaveLength(2);
  });
});

describe('evaluateOutput', () => {
  const dirs: string[] = [];
  const root = process.cwd();

  afterAll(async () => {
    for (const dir of dirs) await rm(dir, { recursive: true, force: true });
  });

  /** JSX を使わずに output.tsx 相当の宣言ファイルを書く */
  async function write(body: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'decopin-output-'));
    dirs.push(dir);
    const file = join(dir, 'output.ts');
    await Bun.write(
      file,
      `import { jsx } from '${root}/src/core/jsx/jsx-runtime.ts';\n` +
        `import { Output, Type } from '${root}/src/index.ts';\n` +
        body
    );
    return file;
  }

  test('ファイルが無ければ何も返さない', async () => {
    expect(await evaluateOutput(undefined)).toEqual({});
  });

  test('宣言を評価して spec を返す', async () => {
    const file = await write(
      'export default () => jsx(Output, { children: jsx(Type.Boolean, {}) });\n'
    );
    expect(await evaluateOutput(file)).toEqual({
      spec: { type: { kind: 'boolean' } },
    });
  });

  test('宣言の誤りは投げずに、ファイル名つきの problem にする', async () => {
    const file = await write('export default () => jsx(Output, {});\n');
    const result = await evaluateOutput(file);
    expect(result.spec).toBeUndefined();
    expect(result.problem?.file).toBe(file);
    expect(result.problem?.message).toMatch(/<Output> needs a Type\.\* child/);
  });

  test('default export が関数でなくても problem にする', async () => {
    const file = await write('export default 1;\n');
    expect((await evaluateOutput(file)).problem?.message).toBe(
      'must default-export a function that returns <Output>'
    );
  });
});
