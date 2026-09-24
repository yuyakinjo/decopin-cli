/**
 * エラーの印 (ADR 42) を読む `errorTag()` と `DeclarationError`。
 *
 * 出自 (instanceof / prototype) ではなく印で見分けること、旧い印も読めること、
 * realm をまたいでも当たることを見る
 */
import { describe, expect, test } from 'bun:test';
import vm from 'node:vm';

import {
  DeclarationError,
  ERROR_TAG,
  errorTag,
  isDeclarationError,
  LEGACY_ERROR_MARKS,
} from '../../src/core/errors.ts';

describe('errorTag', () => {
  test('DeclarationError は種類の名前を返す', () => {
    expect(errorTag(new DeclarationError('bad'))).toBe('DeclarationError');
  });

  test('印の無い Error や Error でない値は undefined', () => {
    expect(errorTag(new Error('plain'))).toBeUndefined();
    expect(errorTag(new TypeError('type'))).toBeUndefined();
    expect(errorTag('DeclarationError')).toBeUndefined();
    expect(errorTag(null)).toBeUndefined();
    expect(errorTag(undefined)).toBeUndefined();
  });

  test('印を持っていても Error でない値は信じない', () => {
    // prototype を真似ただけのものは内部スロットを持たない
    const fake = Object.create(Error.prototype) as Record<symbol, unknown>;
    fake[ERROR_TAG] = 'DeclarationError';
    expect(errorTag(fake)).toBeUndefined();
    expect(errorTag({ [ERROR_TAG]: 'CliError' })).toBeUndefined();
  });

  test('印の値は文字列だけを読む', () => {
    const error = Object.assign(new Error('x'), { [ERROR_TAG]: 42 });
    expect(errorTag(error)).toBeUndefined();
  });

  test('利用者が付けた任意の種類名もそのまま返す', () => {
    const error = Object.assign(new Error('x'), { [ERROR_TAG]: 'MyError' });
    expect(errorTag(error)).toBe('MyError');
  });

  test('旧い印しか無いエラー (旧バージョンが投げたもの) も読める', () => {
    const cli = Object.assign(new Error('old'), {
      [LEGACY_ERROR_MARKS.CliError]: true,
    });
    const decl = Object.assign(new Error('old'), {
      [LEGACY_ERROR_MARKS.DeclarationError]: true,
    });
    expect(errorTag(cli)).toBe('CliError');
    expect(errorTag(decl)).toBe('DeclarationError');
  });

  test('旧い印は true のときだけ当たる', () => {
    const error = Object.assign(new Error('old'), {
      [LEGACY_ERROR_MARKS.CliError]: 'yes',
    });
    expect(errorTag(error)).toBeUndefined();
  });

  test('新しい印と旧い印が食い違えば新しい印が勝つ', () => {
    const error = Object.assign(new Error('both'), {
      [ERROR_TAG]: 'DeclarationError',
      [LEGACY_ERROR_MARKS.CliError]: true,
    });
    expect(errorTag(error)).toBe('DeclarationError');
  });

  test('別の realm で作られた Error でも印を読める', () => {
    const foreign = vm.runInNewContext('new Error("far")') as Error;
    // instanceof では取り逃す相手
    expect(foreign instanceof Error).toBe(false);
    Object.assign(foreign, { [ERROR_TAG]: 'DeclarationError' });
    expect(errorTag(foreign)).toBe('DeclarationError');
    expect(isDeclarationError(foreign)).toBe(true);
  });

  test('印は Symbol.for の登録簿から引く (複数コピーでも同じ印)', () => {
    // unique symbol の型のままだと toBe に渡せないので symbol に広げる
    const marks: symbol[] = [
      ERROR_TAG,
      LEGACY_ERROR_MARKS.CliError,
      LEGACY_ERROR_MARKS.DeclarationError,
    ];
    expect(marks).toEqual([
      Symbol.for('decopin.error'),
      Symbol.for('decopin.CliError'),
      Symbol.for('decopin.DeclarationError'),
    ]);
  });
});

describe('DeclarationError', () => {
  test('name と message を持ち、新旧両方の印を付ける', () => {
    const error = new DeclarationError('<Arg> needs a name');
    expect(error.name).toBe('DeclarationError');
    expect(error.message).toBe('<Arg> needs a name');
    expect(error[ERROR_TAG]).toBe('DeclarationError');
    expect(error[LEGACY_ERROR_MARKS.DeclarationError]).toBe(true);
    expect(String(error)).toBe('DeclarationError: <Arg> needs a name');
  });
});

describe('isDeclarationError', () => {
  test('DeclarationError と、その印を持つ Error に当たる', () => {
    expect(isDeclarationError(new DeclarationError('x'))).toBe(true);
    const tagged = Object.assign(new Error('x'), {
      [ERROR_TAG]: 'DeclarationError',
    });
    expect(isDeclarationError(tagged)).toBe(true);
  });

  test('他の種類や印の無いものには当たらない', () => {
    const cli = Object.assign(new Error('x'), { [ERROR_TAG]: 'CliError' });
    expect(isDeclarationError(cli)).toBe(false);
    expect(isDeclarationError(new Error('x'))).toBe(false);
    expect(isDeclarationError({ name: 'DeclarationError' })).toBe(false);
  });
});
