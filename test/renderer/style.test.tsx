import { describe, expect, test } from 'bun:test';

import { Line, render, Text } from 'decopin-cli';
import type { Renderable } from 'decopin-cli';

const ESC = '\x1b';

/** 16 色で描画する */
function ansi(node: Renderable) {
  return render(node, { color: { stdout: 4, stderr: 4 } });
}

/** 24bit で描画する */
function truecolor(node: Renderable) {
  return render(node, { color: { stdout: 24, stderr: 24 } });
}

describe('装飾', () => {
  test('色名が SGR になる', async () => {
    const result = await ansi(<Text color="green">ok</Text>);
    expect(result.stdout).toBe(`${ESC}[32mok${ESC}[0m\n`);
  });

  test('複数の装飾は 1 つのシーケンスにまとまる', async () => {
    const result = await ansi(
      <Text bold underline color="red">
        ng
      </Text>
    );
    expect(result.stdout).toBe(`${ESC}[1;4;31mng${ESC}[0m\n`);
  });

  test('背景色は +10 のコードになる', async () => {
    const result = await ansi(<Text bg="blue">bg</Text>);
    expect(result.stdout).toBe(`${ESC}[44mbg${ESC}[0m\n`);
  });

  test('入れ子は内側の指定が勝ち、指定のないものは外側を引き継ぐ', async () => {
    const result = await ansi(
      <Text bold color="red">
        <Text color="green">inner</Text>
      </Text>
    );
    // bold は外側から、色は内側が勝つ
    expect(result.stdout).toBe(`${ESC}[1;32minner${ESC}[0m\n`);
  });

  test('装飾のない部分にはシーケンスを出さない', async () => {
    const result = await ansi(
      <Line>
        plain <Text bold>bold</Text>
      </Line>
    );
    expect(result.stdout).toBe(`plain ${ESC}[1mbold${ESC}[0m\n`);
  });

  test('改行は装飾を持たない (色が次の行に漏れない)', async () => {
    const result = await ansi(
      <>
        <Line>
          <Text color="red">a</Text>
        </Line>
        <Line>b</Line>
      </>
    );
    expect(result.stdout).toBe(`${ESC}[31ma${ESC}[0m\nb\n`);
  });

  test('16 進表記は 24bit では truecolor になる', async () => {
    const result = await truecolor(<Text color="#ff8800">x</Text>);
    expect(result.stdout).toBe(`${ESC}[38;2;255;136;0mx${ESC}[0m\n`);
  });

  test('16 進表記は 16 色では最も近い色に丸める', async () => {
    const result = await ansi(<Text color="#ff0000">x</Text>);
    expect(result.stdout).toBe(`${ESC}[91mx${ESC}[0m\n`);
  });

  test('色を落とす設定では装飾を一切出さない', async () => {
    const result = await render(
      <Text bold color="red">
        x
      </Text>,
      { color: { stdout: 0 } }
    );
    expect(result.stdout).toBe('x\n');
  });
});
