/**
 * `<DidYouMean>` の分岐 (ADR 30)。
 *
 * 代表的な出力は test/core/runtime/signals.test.tsx が見ている。
 * ここでは計算済みの候補を渡したとき、空の入力、選べる値が無いとき、
 * どちらも出さないときに何を返すかを見る
 */
import { describe, expect, test } from 'bun:test';

import { render } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import { DidYouMean } from '../../../src/core/components/patterns.tsx';

const TASKS = ['build', 'deploy', 'test'];

async function out(node: RenderInput): Promise<string> {
  const result = await render(node, { env: { NO_COLOR: '1' }, columns: 80 });
  return result.stdout;
}

describe('DidYouMean', () => {
  test('候補を渡せばそれを使い、from からは探さない', async () => {
    // 'biuld' から探せば 'build' だが、渡した候補が優先される
    expect(
      await out(<DidYouMean requested="biuld" from={TASKS} suggestion="test" />)
    ).toBe('Did you mean: test?\n');
  });

  test('候補に undefined を渡すと from から探す', async () => {
    expect(
      await out(
        <DidYouMean requested="deplyo" from={TASKS} suggestion={undefined} />
      )
    ).toBe('Did you mean: deploy?\n');
  });

  test('空の入力には提案せず、選べる値を並べる', async () => {
    expect(await out(<DidYouMean requested="" from={TASKS} />)).toBe(
      'Available: build, deploy, test\n'
    );
  });

  test('選べる値が無ければ何も出さない', async () => {
    expect(await out(<DidYouMean requested="x" from={[]} />)).toBe('');
    // 関数として呼んでも null を返す
    expect(DidYouMean({ requested: 'x', from: [] })).toBeNull();
  });

  test('showAvailable={false} でも候補があれば出す', async () => {
    expect(
      await out(
        <DidYouMean requested="tset" from={TASKS} showAvailable={false} />
      )
    ).toBe('Did you mean: test?\n');
  });

  test('見出しと一覧を 1 行にまとめる', async () => {
    expect(
      await out(
        <DidYouMean requested="zzzzzz" from={['a', 'b']} label="Tasks" />
      )
    ).toBe('Tasks: a, b\n');
  });

  test('候補は太字、前後は薄く出す', async () => {
    const result = await render(<DidYouMean requested="buld" from={TASKS} />, {
      color: { stdout: 4 },
      columns: 80,
    });
    expect(result.stdout).toContain('\x1b[1mbuild');
    expect(result.stdout).toContain('\x1b[2mDid you mean: ');
  });
});
