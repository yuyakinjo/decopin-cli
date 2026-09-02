/**
 * `output.tsx` — data の形を宣言し、実行時に確かめる (ADR 28)。
 *
 * 自分のコードが返す値でも、外から来たものは型の宣言どおりとは限らない。
 * 境界で止めれば、壊れた形のまま表示や `--json` に流れない
 */
import { describe, expect, test } from 'bun:test';

import { Line, Output, run, Type } from 'decopin-cli';
import type { RouteLoaders, RouteTable } from 'decopin-cli';
import * as v from 'valibot';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

async function invoke(table: RouteTable, argv: string[]) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

const loader = (value: unknown) => async () => ({ default: value });

/** counted は 0 以上の整数、name は 1 文字以上 */
const shape = () => (
  <Output>
    <Type.Object>
      <Type.Field name="counted" required>
        <Type.Number min={0} integer />
      </Type.Field>
      <Type.Field name="name" required>
        <Type.String minLength={1} />
      </Type.Field>
    </Type.Object>
  </Output>
);

function route(data: unknown, output?: unknown): RouteLoaders {
  return {
    command: loader(({ data: value }: { data: { name: string } }) => (
      <Line>{value.name}</Line>
    )),
    data: loader(data),
    ...(output === undefined ? {} : { output: loader(output) }),
  };
}

const table: RouteTable = {
  ok: route(() => ({ counted: 2, name: 'alice' }), shape),
  'bad-number': route(() => ({ counted: -1, name: 'alice' }), shape),
  'missing-field': route(() => ({ counted: 1 }), shape),
  'wrong-type': route(() => ({ counted: 'two', name: 'alice' }), shape),
  unchecked: route(() => ({ counted: -1, name: 'alice' })),
  'via-schema': route(
    () => ({ counted: 1, name: 'bob' }),
    () => (
      <Output schema={v.object({ counted: v.number(), name: v.string() })} />
    )
  ),
  'via-schema-bad': route(
    () => ({ counted: 'nope', name: 'bob' }),
    () => (
      <Output schema={v.object({ counted: v.number(), name: v.string() })} />
    )
  ),
  empty: {
    command: loader(() => <Line>hi</Line>),
    data: loader(() => ({ counted: 1, name: 'x' })),
    output: loader(() => <Output />),
  },
};

describe('output.tsx が data を確かめる', () => {
  test('宣言どおりなら素通りする', async () => {
    const result = await invoke(table, ['ok']);
    expect(result).toEqual({ code: 0, stdout: 'alice\n', stderr: '' });
  });

  test('制約に外れたら止める', async () => {
    const result = await invoke(table, ['bad-number']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('>=0');
    expect(result.stdout).toBe('');
  });

  test('必須のキーが無ければ止める', async () => {
    const result = await invoke(table, ['missing-field']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
  });

  test('型が違えば止める', async () => {
    const result = await invoke(table, ['wrong-type']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
  });

  test('--json も同じ検証を通る (表示だけの話ではない)', async () => {
    const result = await invoke(table, ['bad-number', '--json']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
  });

  test('output.tsx が無ければ検証しない', async () => {
    // 宣言していないものを勝手に縛らない
    const result = await invoke(table, ['unchecked']);
    expect(result.code).toBe(0);
  });
});

describe('valibot スキーマを直接渡す口', () => {
  test('schema prop でも検証される', async () => {
    const result = await invoke(table, ['via-schema']);
    expect(result.stdout).toBe('bob\n');
  });

  test('schema prop で外れたら止める', async () => {
    const result = await invoke(table, ['via-schema-bad']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
  });
});

describe('宣言そのものの誤り', () => {
  test('空の <Output> は誤りとして落ちる', async () => {
    const result = await invoke(table, ['empty']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('needs a Type.* child');
  });
});
