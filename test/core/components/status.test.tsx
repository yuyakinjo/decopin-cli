/**
 * 状態のプリセット (`<Success>` / `<Warn>` / `<Info>` / `<Danger>`)。
 *
 * 4 種の記号と ASCII への切り替えは test/core/renderer/decoration.test.tsx が
 * 見ている。ここではプリセットが「記号 + 空白 + 子」の 1 行に展開されること、
 * 子に装飾や複数の要素を渡せること、色の対応を見る
 */
import { describe, expect, test } from 'bun:test';

import { Line, render, Stderr, Text } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import {
  Danger,
  Info,
  Success,
  Warn,
} from '../../../src/core/components/status.tsx';
import { isElement } from '../../../src/core/jsx/types.ts';

function plain(node: RenderInput) {
  return render(node, {
    color: { stdout: 0, stderr: 0 },
    columns: 80,
    unicode: true,
  });
}

describe('展開のされ方', () => {
  test('プリセットは Line を返し、中に記号と子を並べる', () => {
    const node = Success({ children: 'done' });
    expect(isElement(node)).toBe(true);
    if (!isElement(node)) return;
    expect(node.type).toBe(Line);
    const children = node.props.children as unknown[];
    const [symbol] = children;
    expect(isElement(symbol) && symbol.props.kind).toBe('success');
    expect(children.slice(1)).toEqual([' ', 'done']);
  });

  test('プリセットごとに記号の種類が決まっている', () => {
    const kinds = [Success, Warn, Info, Danger].map((preset) => {
      const node = preset({ children: 'x' });
      if (!isElement(node)) return undefined;
      const [symbol] = node.props.children as unknown[];
      return isElement(symbol) ? symbol.props.kind : undefined;
    });
    expect(kinds).toEqual(['success', 'warn', 'info', 'danger']);
  });
});

describe('描画', () => {
  test('子に装飾付きの要素と文字を混ぜられる', async () => {
    const result = await plain(
      <Success>
        <Text bold>3</Text> files written
      </Success>
    );
    expect(result.stdout).toBe('✔ 3 files written\n');
  });

  test('子が無くても記号の行は出る', async () => {
    const result = await plain(<Warn />);
    expect(result.stdout).toBe('⚠ \n');
  });

  test('Stderr の中に置けば stderr に出る', async () => {
    const result = await plain(
      <Stderr>
        <Danger>failed</Danger>
      </Stderr>
    );
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('✖ failed\n');
  });

  test('色は記号にだけ付く (16 色)', async () => {
    const colored = async (node: RenderInput) =>
      (await render(node, { color: { stdout: 4 }, columns: 80 })).stdout;
    expect(await colored(<Warn>w</Warn>)).toBe('\x1b[33m⚠\x1b[0m w\n');
    expect(await colored(<Info>i</Info>)).toBe('\x1b[34mℹ\x1b[0m i\n');
    expect(await colored(<Danger>d</Danger>)).toBe('\x1b[31m✖\x1b[0m d\n');
  });
});
