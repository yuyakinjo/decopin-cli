/**
 * `host()` が作る組み込みコンポーネントの実体。
 *
 * レンダラーは `$host` を見て解釈するので、関数としては呼ばれない。
 * 呼ばれたら直し方の分かる RenderError を投げること、名前と種類を
 * 正しく持つことを見る
 */
import { describe, expect, test } from 'bun:test';

import { isRenderError, RenderError } from 'decopin-cli';

import { host } from '../../../src/core/components/host.ts';
import { isHost } from '../../../src/core/jsx/types.ts';

describe('host', () => {
  test('種類を $host に、表示名を name に持つ', () => {
    const Panel = host<{ title: string }>('box', 'Panel');
    expect(Panel.$host).toBe('box');
    expect(Panel.name).toBe('Panel');
    expect(isHost(Panel)).toBe(true);
  });

  test('$host は列挙できる (props の展開などで見える)', () => {
    const Row = host('line', 'Row');
    expect(Object.keys(Row)).toEqual(['$host']);
  });

  test('$host と name は書き換えられない', () => {
    const Row = host('line', 'Row') as unknown as Record<string, unknown>;
    expect(() => {
      Row.$host = 'text';
    }).toThrow(TypeError);
    expect(Row.$host).toBe('line');
  });

  test('関数として呼ぶと、名前入りの RenderError を投げる', () => {
    const Row = host<Record<never, never>>('line', 'Row');
    let caught: unknown;
    try {
      Row({});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RenderError);
    expect(isRenderError(caught)).toBe(true);
    expect((caught as Error).message).toBe(
      '<Row> is a built-in interpreted by decopin-cli and cannot be called as a function'
    );
  });

  test('作るたびに別の関数になる (同じ種類でも共有しない)', () => {
    const a = host('text', 'A');
    const b = host('text', 'B');
    expect(a).not.toBe(b);
    expect(a.name).toBe('A');
    expect(b.name).toBe('B');
  });
});
