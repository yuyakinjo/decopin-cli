/**
 * ルートの not-found.tsx で未知のコマンドを表示する処理。
 * 利用者のファイルへ props を渡すこと、使えないときに組み込みの
 * 「Unknown command」表示へ戻ることを単体で見る。
 */
import { describe, expect, test } from 'bun:test';

import { Line, render } from 'decopin-cli';
import type { NotFoundProps, RenderInput } from 'decopin-cli';

import { FILE_NAME } from '../../../../src/features/root-only/not-found/definition.ts';
import { presentRootNotFound } from '../../../../src/features/root-only/not-found/runtime.ts';

const props: NotFoundProps = {
  what: 'command',
  requested: 'helo',
  suggestion: 'hello',
  available: ['hello', 'user list'],
  program: 'cli',
  argv: ['helo'],
  cwd: '/work',
};

async function text(node: RenderInput) {
  const result = await render(node, { env: { NO_COLOR: '1' }, columns: 80 });
  return result.stdout;
}

describe('presentRootNotFound', () => {
  test('not-found.tsx が無ければ組み込みの案内を出す', async () => {
    const shown = await presentRootNotFound(undefined, props);
    expect(shown).toMatchObject({ overridden: false, skipLayout: false });
    const output = await text(shown.node);
    expect(output).toContain('Unknown command: helo');
    expect(output).toContain('hello');
  });

  test('利用者の not-found.tsx に props をそのまま渡す', async () => {
    const shown = await presentRootNotFound(
      async () => ({
        default: ({ program, requested, suggestion }: NotFoundProps) => (
          <Line>
            {program}: {requested} → {suggestion}
          </Line>
        ),
      }),
      props
    );
    expect(shown.overridden).toBe(true);
    expect(await text(shown.node)).toBe('cli: helo → hello\n');
  });

  test('async な not-found.tsx も待ってから使う', async () => {
    const shown = await presentRootNotFound(
      async () => ({
        default: async () => <Line>later</Line>,
        skipLayout: true,
      }),
      props
    );
    expect(shown.skipLayout).toBe(true);
    expect(await text(shown.node)).toBe('later\n');
  });

  test('default export が関数でなければ組み込みに戻る', async () => {
    const shown = await presentRootNotFound(
      async () => ({ default: 'not a component' }),
      props
    );
    expect(shown.overridden).toBe(false);
    expect(await text(shown.node)).toContain('Unknown command: helo');
  });

  test('読み込み自体が失敗しても組み込みに戻る', async () => {
    const shown = await presentRootNotFound(async () => {
      throw new Error('syntax error');
    }, props);
    expect(shown.overridden).toBe(false);
    expect(await text(shown.node)).toContain('Unknown command: helo');
  });

  test('定義のファイル名は not-found', () => {
    expect(FILE_NAME).toBe('not-found');
  });
});
