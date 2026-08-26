import { describe, expect, test } from 'bun:test';

import { write } from '../../src/renderer/writer.ts';

function recorder() {
  const calls: string[] = [];
  return { calls, write: (chunk: string) => calls.push(chunk) };
}

describe('write', () => {
  test('fd ごとに 1 回だけ書き、stdout → stderr の順に出す', () => {
    const order: string[] = [];
    const stdout = { write: (c: string) => order.push(`out:${c}`) };
    const stderr = { write: (c: string) => order.push(`err:${c}`) };

    write(
      { stdout: 'a\nb\n', stderr: 'e\n', exitCode: undefined },
      {
        stdout,
        stderr,
      }
    );

    expect(order).toEqual(['out:a\nb\n', 'err:e\n']);
  });

  test('空の出力には write しない', () => {
    const stdout = recorder();
    const stderr = recorder();
    write({ stdout: '', stderr: '', exitCode: undefined }, { stdout, stderr });
    expect(stdout.calls).toEqual([]);
    expect(stderr.calls).toEqual([]);
  });
});
