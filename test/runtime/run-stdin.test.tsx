/**
 * ライフサイクルの中での stdin (§7 の 6)。
 * 読むのは middleware の内側なので、打ち切れば標準入力を消費しない。
 */
import { describe, expect, test } from 'bun:test';

import { Br, Line, run, Stdin } from 'decopin-cli';
import type { MiddlewareProps, RouteTable, StdinSource } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

function source(text: string, isTTY = false) {
  let reads = 0;
  const stdin: StdinSource = {
    isTTY,
    read: async () => {
      reads += 1;
      return text;
    },
  };
  return {
    stdin,
    get reads() {
      return reads;
    },
  };
}

async function invoke(table: RouteTable, argv: string[], stdin: StdinSource) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    stdin,
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

function loader(value: unknown) {
  return async () => ({ default: value });
}

/** 生成された型はテスト用のルートには無いので、ここでは手で書く */
const showStdin = ({ stdin }: { stdin: unknown }) => (
  <Line>{JSON.stringify(stdin)}</Line>
);

describe('stdin.tsx とライフサイクル', () => {
  test('宣言があれば読んでコマンドに渡す', async () => {
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Stdin mode="lines" required />),
      },
    };
    const piped = source('a\nb\n');
    const result = await invoke(table, ['x'], piped.stdin);
    expect(result.stdout).toBe('["a","b"]\n');
    expect(piped.reads).toBe(1);
  });

  test('宣言がなければ stdin に一切触らない', async () => {
    const table: RouteTable = { x: { command: loader(showStdin) } };
    const piped = source('a\nb\n');
    const result = await invoke(table, ['x'], piped.stdin);
    expect(result.stdout).toBe('\n');
    // ここが Phase 6 で一番大事な性質 (端末実行でフリーズしない)
    expect(piped.reads).toBe(0);
  });

  test('端末で required なら exit 2', async () => {
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Stdin mode="text" required />),
      },
    };
    const tty = source('', true);
    const result = await invoke(table, ['x'], tty.stdin);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('requires input on stdin');
    expect(tty.reads).toBe(0);
  });

  test('端末で required でなければ undefined が渡る', async () => {
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Stdin mode="text" />),
      },
    };
    const tty = source('', true);
    const result = await invoke(table, ['x'], tty.stdin);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('\n');
  });

  test('middleware が next を呼ばなければ stdin を消費しない', async () => {
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Stdin mode="text" required />),
        middlewares: [loader(() => <Line>short circuit</Line>)],
      },
    };
    const piped = source('data');
    const result = await invoke(table, ['x'], piped.stdin);
    expect(result.stdout).toBe('short circuit\n');
    expect(piped.reads).toBe(0);
  });

  test('middleware は stdin を props に持たない', async () => {
    const seen: string[] = [];
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Stdin mode="text" required />),
        middlewares: [
          loader(async (props: MiddlewareProps) => {
            seen.push(...Object.keys(props).sort());
            return props.next();
          }),
        ],
      },
    };
    await invoke(table, ['x'], source('data').stdin);
    expect(seen).toEqual(['args', 'argv', 'cwd', 'env', 'next', 'options']);
  });

  test('stdin.tsx が <Stdin> を返していなければ分かるエラーになる', async () => {
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Br />),
      },
    };
    const result = await invoke(table, ['x'], source('').stdin);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('must return a single <Stdin> element');
  });

  test('--help は stdin を読まない', async () => {
    const table: RouteTable = {
      x: {
        command: loader(showStdin),
        stdin: loader(() => <Stdin mode="text" required />),
      },
    };
    const piped = source('data');
    const result = await invoke(table, ['x', '--help'], piped.stdin);
    expect(result.code).toBe(0);
    expect(piped.reads).toBe(0);
  });
});
