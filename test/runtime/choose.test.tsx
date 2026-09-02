/**
 * choose() (ADR 36)。
 *
 * 対話は端末とだけ。stdin と stderr が端末でなければ exit 2 で「引数で渡して」
 * と言う。描くのは stderr だけで stdout には出ない。Esc / Ctrl+C は 130
 */
import { describe, expect, test } from 'bun:test';

import { choose, Line, run } from 'decopin-cli';
import type { RouteTable, Terminal } from 'decopin-cli';

const ESC = String.fromCharCode(27);
const CTRL_C = String.fromCharCode(3);

/** 打鍵を予め並べた端末 */
function scripted(keys: string[], interactive = true) {
  const written: string[] = [];
  const terminal: Terminal = {
    interactive,
    colors: false,
    unicode: false,
    write: (text) => {
      written.push(text);
    },
    keys: async function* () {
      yield* keys;
    },
  };
  return { terminal, written };
}

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

const loader = (value: unknown) => async () => ({ default: value });

const table: RouteTable = {
  pick: {
    command: loader(async () => {
      const color = await choose('Which?', ['red', 'green', 'blue'] as const, {
        hint: 'Pass it: pick <color>',
      });
      // 型は literal union。存在しない値との比較は型エラーになる
      const chosen: 'red' | 'green' | 'blue' = color;
      return <Line>{chosen}</Line>;
    }),
  },
};

async function invoke(terminal: Terminal) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv: ['pick'],
    program: 'cli',
    env: {},
    targets: { stdout, stderr },
    terminal,
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

describe('choose()', () => {
  test('↓ と Enter で選ぶ。描くのは端末 (stderr) だけで stdout には結果だけ', async () => {
    const { terminal, written } = scripted([`${ESC}[B`, '\r']);
    const result = await invoke(terminal);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('green\n');
    expect(result.stderr).toBe('');
    // 最初の描画、移動後の描画、確定後の 1 行
    expect(written.length).toBe(3);
    expect(written[0]).toContain('> red');
    expect(written[1]).toContain('> green');
    expect(written[2]).toContain('Which? green');
  });

  test('j / k と数字でも動く。端を越えると回る', async () => {
    const { terminal } = scripted(['k', '\r']);
    expect((await invoke(terminal)).stdout).toBe('blue\n');
    const digit = scripted(['3', 'k', 'j', 'j', '\r']);
    expect((await invoke(digit.terminal)).stdout).toBe('red\n');
  });

  test('Esc / Ctrl+C は何も出さず 130', async () => {
    for (const key of [ESC, CTRL_C]) {
      const { terminal } = scripted([key]);
      const result = await invoke(terminal);
      expect(result.code).toBe(130);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    }
  });

  test('入力が閉じても 130 (端末が消えた)', async () => {
    const { terminal } = scripted([]);
    expect((await invoke(terminal)).code).toBe(130);
  });

  test('端末でなければ exit 2 で、引数で渡す道を示す', async () => {
    const { terminal } = scripted([], false);
    const result = await invoke(terminal);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(
      '"Which?" needs a terminal to choose from: red, green, blue'
    );
    expect(result.stderr).toContain('Pass it: pick <color>');
  });

  test('targets を差し替えているなら既定で端末ではない (テストが勝手に止まらない)', async () => {
    const stdout = recorder();
    const stderr = recorder();
    const code = await run(table, {
      argv: ['pick'],
      program: 'cli',
      env: {},
      targets: { stdout, stderr },
    });
    expect(code).toBe(2);
  });

  test('候補が無いのはプログラムの誤り', async () => {
    const { terminal } = scripted([]);
    const stdout = recorder();
    const stderr = recorder();
    const code = await run(
      {
        empty: {
          command: loader(async () => <Line>{await choose('?', [])}</Line>),
        },
      },
      {
        argv: ['empty'],
        program: 'cli',
        env: {},
        targets: { stdout, stderr },
        terminal,
      }
    );
    expect(code).toBe(1);
    expect(stderr.text).toContain('was given no values');
  });
});
