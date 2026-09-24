import { describe, expect, test } from 'bun:test';

import { Br, Line, render, RenderError, Stderr, Text } from 'decopin-cli';

const options = { color: { stdout: 0 as const, stderr: 0 as const } };

describe('構造の誤りを分かるエラーにする', () => {
  test('<Line> の入れ子', async () => {
    const promise = render(
      <Line>
        <Line>inner</Line>
      </Line>,
      options
    );
    await expect(promise).rejects.toThrow(RenderError);
    await expect(promise).rejects.toThrow(
      /cannot be nested inside another <Line>/
    );
  });

  test('<Line> の中の <Br />', async () => {
    const promise = render(
      <Line>
        a
        <Br />
      </Line>,
      options
    );
    await expect(promise).rejects.toThrow(
      /<Br \/> cannot appear inside a <Line>/
    );
  });

  test('<Line> の中での出力先の切り替え', async () => {
    const promise = render(
      <Line>
        a<Stderr>b</Stderr>
      </Line>,
      options
    );
    await expect(promise).rejects.toThrow(/A line belongs to a single output/);
  });

  test('<Text> の中に <Line> は置ける (Text は装飾だけを担う)', async () => {
    const result = await render(
      <Text bold>
        <Line>a</Line>
      </Text>,
      options
    );
    expect(result.stdout).toBe('a\n');
  });
});
