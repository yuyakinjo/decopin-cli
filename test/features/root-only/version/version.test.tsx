/**
 * version.tsx の読み込み (`--version`)。
 * default export を呼んで <Version> を読み取る loadVersionSpec と、
 * 宣言の形が崩れているときに parseVersionSpec が出す文面を見る。
 * (version / name の基本の組み合わせは env.test.tsx 側で見ている)
 */
import { describe, expect, test } from 'bun:test';

import { DeclarationError, Env, Version } from 'decopin-cli';
import type { RenderInput } from 'decopin-cli';

import { resolveHosts } from '../../../../src/core/jsx/resolve.ts';
import { CliError } from '../../../../src/core/runtime/errors.ts';
import { FILE_NAME } from '../../../../src/features/root-only/version/definition.ts';
import { parseVersionSpec } from '../../../../src/features/root-only/version/parse.ts';
import { loadVersionSpec } from '../../../../src/features/root-only/version/runtime.ts';

const moduleOf = (value: unknown) => async () => ({ default: value });

describe('loadVersionSpec', () => {
  test('default export を呼んで <Version> を読む', async () => {
    const spec = await loadVersionSpec(
      moduleOf(() => <Version name="mycli" version="2.0.0" />)
    );
    expect(spec).toEqual({ version: '2.0.0', name: 'mycli' });
  });

  test('async な default export や共有コンポーネント越しでも読める', async () => {
    const Shared = () => <Version version="3.1.4" />;
    const spec = await loadVersionSpec(moduleOf(async () => <Shared />));
    expect(spec).toEqual({ version: '3.1.4', name: undefined });
  });

  test('default export が関数でなければ CliError', async () => {
    const promise = loadVersionSpec(moduleOf({ version: '1.0.0' }));
    await expect(promise).rejects.toBeInstanceOf(CliError);
    await expect(promise).rejects.toThrow(
      'Version must default-export a function that returns <Version>'
    );
  });

  test('呼び出し側が渡したエラーを優先する', async () => {
    const custom = new Error('version.tsx is broken');
    await expect(
      loadVersionSpec(moduleOf(undefined), () => custom)
    ).rejects.toBe(custom);
  });

  test('default export が正しければ差し替え用のエラーは作らない', async () => {
    let made = false;
    await loadVersionSpec(
      moduleOf(() => <Version version="1.0.0" />),
      () => {
        made = true;
        return new Error('unused');
      }
    );
    expect(made).toBe(false);
  });

  test('宣言が崩れていれば DeclarationError をそのまま伝える', async () => {
    await expect(
      loadVersionSpec(moduleOf(() => <Version version="" />))
    ).rejects.toBeInstanceOf(DeclarationError);
  });
});

describe('parseVersionSpec の形の検査', () => {
  async function parse(node: RenderInput) {
    return parseVersionSpec(await resolveHosts(node));
  }

  test('何も返さないと単一の <Version> を求める', async () => {
    await expect(parse(null)).rejects.toThrow(
      'version.tsx must return a single <Version> element'
    );
  });

  test('<Version> が 2 つあっても拒む', async () => {
    await expect(
      parse(
        <>
          <Version version="1.0.0" />
          <Version version="2.0.0" />
        </>
      )
    ).rejects.toThrow('version.tsx must return a single <Version> element');
  });

  test('別の宣言 (<Env>) は <Version> として扱わない', async () => {
    await expect(parse(<Env>{[]}</Env>)).rejects.toThrow(
      'version.tsx must return a single <Version> element'
    );
  });

  test('空文字の version は未指定と同じく拒む', async () => {
    await expect(parse(<Version version="" />)).rejects.toThrow(
      '<Version version> is required'
    );
  });

  test('name が文字列でなければ型を添えて拒む', async () => {
    await expect(
      parse(<Version version="1.0.0" name={42 as unknown as string} />)
    ).rejects.toThrow('<Version name> requires a string, received number');
  });
});

describe('version の定義', () => {
  test('ファイル名は version、<Version> は version という組み込みノード', async () => {
    expect(FILE_NAME).toBe('version');
    const [node] = await resolveHosts(<Version version="1.0.0" />);
    expect(node?.kind).toBe('version');
    expect(node?.props).toEqual({ version: '1.0.0' });
  });
});
