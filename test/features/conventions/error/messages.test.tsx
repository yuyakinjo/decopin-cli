/**
 * `error/messages.tsx` の単体テスト。
 *
 * error.tsx が無いときや表示に失敗したときにフレームワークが出す既定の
 * エラー表示 (`ErrorMessage`) と、`DECOPIN_DEBUG=1` で足す連鎖表示
 * (`ErrorTrace`) を描画し、出る先 (stderr) と行の組み立てを確かめる。
 */
import { describe, expect, test } from 'bun:test';

import { render } from 'decopin-cli';

import {
  ErrorMessage,
  ErrorTrace,
} from '../../../../src/features/conventions/error/messages.tsx';

const plain = { color: { stdout: 0 as const, stderr: 0 as const } };
const colored = { color: { stdout: 4 as const, stderr: 4 as const } };

describe('ErrorMessage', () => {
  test('stderr に ✖ 付きで 1 行出し、stdout には何も出さない', async () => {
    const result = await render(
      <ErrorMessage message="file not found" />,
      plain
    );
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('✖ file not found\n');
  });

  test('ヒントはメッセージの後ろに 1 行ずつ並ぶ', async () => {
    const result = await render(
      <ErrorMessage
        message="unknown option --fo"
        hints={['did you mean --foo?', 'run with --help']}
      />,
      plain
    );
    expect(result.stderr).toBe(
      '✖ unknown option --fo\ndid you mean --foo?\nrun with --help\n'
    );
  });

  test('色が使えるときは ✖ を赤、ヒントを dim にする', async () => {
    const result = await render(
      <ErrorMessage message="boom" hints={['hint']} />,
      colored
    );
    // 赤 (31) と dim (2) の SGR が付き、本文そのものは素のまま残る
    expect(result.stderr).toContain('\x1b[31m✖ ');
    expect(result.stderr).toContain('\x1b[2mhint');
    expect(Bun.stripANSI(result.stderr)).toBe('✖ boom\nhint\n');
  });
});

describe('ErrorTrace', () => {
  test('渡された行をそのまま順に stderr へ出す', async () => {
    const lines = ['Error: outer', '  at run (a.ts:1)', 'Caused by: inner'];
    const result = await render(<ErrorTrace lines={lines} />, plain);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(`${lines.join('\n')}\n`);
  });

  test('同じ文字列の行が続いても潰さずに 2 行とも出す', async () => {
    const result = await render(
      <ErrorTrace lines={['  at <anonymous>', '  at <anonymous>']} />,
      plain
    );
    expect(result.stderr).toBe('  at <anonymous>\n  at <anonymous>\n');
  });
});
