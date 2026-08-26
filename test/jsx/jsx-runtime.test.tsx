import { describe, expect, test } from 'bun:test';

import { Line, Text } from 'decopin-cli';

import { Fragment, jsx } from '../../src/jsx/jsx-runtime.ts';
import { isElement } from '../../src/jsx/types.ts';

describe('jsx-runtime', () => {
  test('JSX 式が要素データになる', () => {
    const element = <Text bold>hello</Text>;
    expect(isElement(element)).toBe(true);
  });

  test('jsx() は type と props を保持するだけ (評価はしない)', () => {
    const element = jsx(Text, { bold: true, children: 'hi' });
    expect(element.type).toBe(Text);
    expect(element.props).toEqual({ bold: true, children: 'hi' });
  });

  test('Fragment は children を素通しする', () => {
    expect(Fragment({ children: 'x' })).toBe('x');
  });

  test('組み込みコンポーネントを直接呼ぶと分かるエラーになる', () => {
    expect(() => (Line as unknown as () => never)()).toThrow(
      /組み込みコンポーネント/
    );
  });
});
