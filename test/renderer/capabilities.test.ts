import { describe, expect, test } from 'bun:test';

import { resolveColorDepth } from '../../src/renderer/capabilities.ts';

describe('色を落とす条件 (test/renderer/capabilities.test.ts)', () => {
  test('端末なら 16 色', () => {
    expect(resolveColorDepth({ isTTY: true, env: {} })).toBe(4);
  });

  test('COLORTERM=truecolor なら 24bit', () => {
    expect(
      resolveColorDepth({ isTTY: true, env: { COLORTERM: 'truecolor' } })
    ).toBe(24);
  });

  test('パイプ・リダイレクト (非 TTY) では落とす', () => {
    expect(resolveColorDepth({ isTTY: false, env: {} })).toBe(0);
  });

  test('NO_COLOR で落とす', () => {
    expect(resolveColorDepth({ isTTY: true, env: { NO_COLOR: '1' } })).toBe(0);
  });

  test('NO_COLOR が空文字なら「未設定」として扱う', () => {
    expect(resolveColorDepth({ isTTY: true, env: { NO_COLOR: '' } })).toBe(4);
  });

  test('--no-color で落とす', () => {
    expect(resolveColorDepth({ isTTY: true, env: {}, noColorFlag: true })).toBe(
      0
    );
  });

  test('TERM=dumb で落とす', () => {
    expect(resolveColorDepth({ isTTY: true, env: { TERM: 'dumb' } })).toBe(0);
  });

  test('FORCE_COLOR は NO_COLOR / 非 TTY より強い', () => {
    expect(
      resolveColorDepth({
        isTTY: false,
        env: { FORCE_COLOR: '1', NO_COLOR: '1', TERM: 'dumb' },
        noColorFlag: true,
      })
    ).toBe(4);
  });

  test('FORCE_COLOR=0 は「明示的に落とす」', () => {
    expect(resolveColorDepth({ isTTY: true, env: { FORCE_COLOR: '0' } })).toBe(
      0
    );
  });
});
