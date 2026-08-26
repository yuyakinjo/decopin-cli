/**
 * Phase 6 の完了条件: パイプ有 / 無 / TTY / required の 4 パターン (§4.2)。
 */
import { describe, expect, test } from 'bun:test';

import { CliError } from 'decopin-cli';

import type { StdinSpec } from '../../src/declaration/spec.ts';
import { readStdin } from '../../src/runtime/stdin-reader.ts';

/** パイプされている状態 */
function piped(text: string) {
  let reads = 0;
  return {
    source: {
      isTTY: false,
      read: async () => {
        reads += 1;
        return text;
      },
    },
    get reads() {
      return reads;
    },
  };
}

/** 端末で実行された状態 */
function terminal() {
  let reads = 0;
  return {
    source: {
      isTTY: true,
      read: async () => {
        reads += 1;
        return '';
      },
    },
    get reads() {
      return reads;
    },
  };
}

const base: StdinSpec = { mode: 'text', required: false, trim: false };

describe('端末で実行された場合', () => {
  test('required でなければ読まずに undefined', async () => {
    const tty = terminal();
    expect(await readStdin(base, tty.source)).toBeUndefined();
    // 読もうとすると入力待ちでフリーズするので、触ってはいけない
    expect(tty.reads).toBe(0);
  });

  test('required なら exit 2 で、どうすればよいか伝える', async () => {
    const tty = terminal();
    const promise = readStdin({ ...base, required: true }, tty.source);
    await expect(promise).rejects.toThrow(CliError);
    try {
      await promise;
    } catch (error) {
      const cliError = error as CliError;
      expect(cliError.kind).toBe('stdin');
      expect(cliError.exitCode).toBe(2);
      expect(cliError.issues.join('\n')).toContain('echo "..." |');
    }
    expect(tty.reads).toBe(0);
  });
});

describe('mode="text"', () => {
  test('全文をそのまま渡す', async () => {
    expect(await readStdin(base, piped('a\nb\n').source)).toBe('a\nb\n');
  });

  test('trim を付けると末尾の改行を落とす', async () => {
    expect(
      await readStdin({ ...base, trim: true }, piped('hello\n').source)
    ).toBe('hello');
  });

  test('空入力は空文字 (required でも通る)', async () => {
    expect(await readStdin({ ...base, required: true }, piped('').source)).toBe(
      ''
    );
  });
});

describe('mode="lines"', () => {
  const lines: StdinSpec = { mode: 'lines', required: false, trim: false };

  test('改行で分割し、末尾の空行は落とす', async () => {
    expect(await readStdin(lines, piped('a\nb\n').source)).toEqual(['a', 'b']);
  });

  test('途中の空行は残す', async () => {
    expect(await readStdin(lines, piped('a\n\nb\n').source)).toEqual([
      'a',
      '',
      'b',
    ]);
  });

  test('CRLF も分割する', async () => {
    expect(await readStdin(lines, piped('a\r\nb\r\n').source)).toEqual([
      'a',
      'b',
    ]);
  });

  test('空入力は空配列', async () => {
    expect(await readStdin(lines, piped('').source)).toEqual([]);
  });

  test('末尾に改行が無くても最後の行を落とさない', async () => {
    expect(await readStdin(lines, piped('a\nb').source)).toEqual(['a', 'b']);
  });
});

describe('mode="json"', () => {
  const json: StdinSpec = { mode: 'json', required: true, trim: false };

  test('構造の宣言が無ければ JSON.parse の結果をそのまま渡す', async () => {
    expect(await readStdin(json, piped('{"a":1}').source)).toEqual({ a: 1 });
  });

  test('壊れた JSON は exit 2', async () => {
    const promise = readStdin(json, piped('not json').source);
    await expect(promise).rejects.toThrow(/stdin is not valid JSON/);
  });

  test('構造の宣言に照らして検証する', async () => {
    const typed: StdinSpec = {
      ...json,
      type: {
        kind: 'array',
        item: {
          kind: 'object',
          fields: [{ name: 'id', required: true, type: { kind: 'number' } }],
        },
      },
    };
    expect(await readStdin(typed, piped('[{"id":1}]').source)).toEqual([
      { id: 1 },
    ]);
    await expect(
      readStdin(typed, piped('[{"id":"x"}]').source)
    ).rejects.toThrow(/does not match the declared structure/);
  });
});
