/**
 * global-error.tsx を継承 error.tsx の連鎖の末尾に加える処理。
 * 並び順・入力を壊さないこと・handleError と組み合わせたときの
 * フォールバック (error.tsx が全滅したら global-error.tsx) を見る。
 */
import { describe, expect, test } from 'bun:test';

import { CliError, Line } from 'decopin-cli';
import type { ErrorProps, RenderInput } from 'decopin-cli';

import {
  handleError,
  type ErrorHandlerLoader,
} from '../../../../src/features/inherited/error/runtime.tsx';
import { FILE_NAME } from '../../../../src/features/root-only/global-error/definition.ts';
import { withGlobalError } from '../../../../src/features/root-only/global-error/runtime.ts';

const named =
  (label: string): ErrorHandlerLoader =>
  async () => ({ default: () => label });

describe('withGlobalError', () => {
  test('継承 error.tsx の後ろに global-error.tsx を足す', () => {
    const near = named('near');
    const outer = named('outer');
    const global = named('global');
    expect(withGlobalError([near, outer], global)).toEqual([
      near,
      outer,
      global,
    ]);
  });

  test('global-error.tsx が無ければ継承分だけ', () => {
    const near = named('near');
    expect(withGlobalError([near], undefined)).toEqual([near]);
  });

  test('継承が無ければ global-error.tsx だけ、両方無ければ空', () => {
    const global = named('global');
    expect(withGlobalError(undefined, global)).toEqual([global]);
    expect(withGlobalError(undefined, undefined)).toEqual([]);
  });

  test('渡した配列は書き換えず、新しい配列を返す', () => {
    const inherited = [named('near')];
    const result = withGlobalError(inherited, named('global'));
    expect(inherited).toHaveLength(1);
    expect(result).not.toBe(inherited);
  });

  test('定義のファイル名は global-error', () => {
    expect(FILE_NAME).toBe('global-error');
  });
});

describe('handleError と組み合わせたとき', () => {
  async function handle(handlers: ErrorHandlerLoader[]) {
    const emitted: RenderInput[] = [];
    const result = await handleError({
      error: new CliError('boom'),
      handlers,
      argv: [],
      cwd: '/work',
      emit: async (node) => {
        emitted.push(node);
        return undefined;
      },
    });
    return { emitted, exitCode: result.exitCode };
  }

  test('error.tsx が落ちたら末尾の global-error.tsx が表示する', async () => {
    const broken: ErrorHandlerLoader = async () => ({
      default: () => {
        throw new Error('handler down');
      },
    });
    const seen: string[] = [];
    const global: ErrorHandlerLoader = async () => ({
      default: ({ error }: ErrorProps) => {
        seen.push(error.message);
        return <Line>global</Line>;
      },
    });

    const { emitted, exitCode } = await handle(
      withGlobalError([broken], global)
    );

    expect(seen).toEqual(['boom']);
    expect(emitted).toHaveLength(1);
    expect(exitCode).toBe(new CliError('x').exitCode);
  });

  test('近い error.tsx が表示できれば global-error.tsx は呼ばれない', async () => {
    let globalCalled = false;
    const near: ErrorHandlerLoader = async () => ({
      default: () => <Line>near</Line>,
    });
    const global: ErrorHandlerLoader = async () => {
      globalCalled = true;
      return { default: () => <Line>global</Line> };
    };

    await handle(withGlobalError([near], global));

    expect(globalCalled).toBe(false);
  });
});
