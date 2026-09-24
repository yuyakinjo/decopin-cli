/**
 * 継承される not-found.tsx (ADR 30)。
 * build 側で近い順に並べることと、実行時に notFound() の結果を
 * 最も近い 1 つだけで表示し、使えなければ組み込み表示へ戻ることを見る。
 */
import { describe, expect, test } from 'bun:test';

import { Line, render } from 'decopin-cli';
import type { NotFoundProps, RenderInput } from 'decopin-cli';

import type { InheritedFilesByDirectory } from '../../../../src/features/inherited/chain.ts';
import { createNotFoundChains } from '../../../../src/features/inherited/not-found/build.ts';
import { FILE_NAME } from '../../../../src/features/inherited/not-found/definition.ts';
import { presentInheritedNotFound } from '../../../../src/features/inherited/not-found/runtime.ts';

const props: NotFoundProps = {
  what: 'user',
  requested: 'bob',
  suggestion: 'bobby',
  available: ['alice', 'bobby'],
  program: 'cli',
  argv: ['user', 'show', 'bob'],
  cwd: '/work',
};

async function text(node: RenderInput) {
  const result = await render(node, { env: { NO_COLOR: '1' }, columns: 80 });
  return result.stdout;
}

describe('createNotFoundChains', () => {
  const inherited: InheritedFilesByDirectory = new Map([
    ['', { 'not-found': 'app/not-found.tsx' }],
    ['user', { 'not-found': 'app/user/not-found.tsx' }],
  ]);

  test('自分に近い not-found.tsx が先頭に来る', () => {
    const chains = createNotFoundChains(
      [{ name: 'user/show', dir: 'user' }],
      inherited
    );
    expect(chains.get('user/show')).toEqual([
      'app/user/not-found.tsx',
      'app/not-found.tsx',
    ]);
  });

  test('別の枝のコマンドはルートの not-found.tsx だけを受け継ぐ', () => {
    const chains = createNotFoundChains(
      [{ name: 'repo/show', dir: 'repo' }],
      inherited
    );
    expect(chains.get('repo/show')).toEqual(['app/not-found.tsx']);
  });

  test('定義のファイル名は not-found', () => {
    expect(FILE_NAME).toBe('not-found');
  });
});

describe('presentInheritedNotFound', () => {
  test('最も近い not-found.tsx に props を渡して使う', async () => {
    const received: NotFoundProps[] = [];
    const nearest = async () => ({
      default: (given: NotFoundProps) => {
        received.push(given);
        return <Line>近い: {given.requested}</Line>;
      },
    });
    const outer = async () => ({
      default: () => <Line>外側</Line>,
    });

    const shown = await presentInheritedNotFound([nearest, outer], props);

    expect(shown.overridden).toBe(true);
    expect(received).toEqual([props]);
    expect(await text(shown.node)).toBe('近い: bob\n');
  });

  test('近いものが落ちても親へは進まず、組み込み表示に戻る', async () => {
    let outerCalled = false;
    const broken = async () => ({
      default: () => {
        throw new Error('boom');
      },
    });
    const outer = async () => {
      outerCalled = true;
      return { default: () => <Line>外側</Line> };
    };

    const shown = await presentInheritedNotFound([broken, outer], props);

    expect(shown.overridden).toBe(false);
    expect(outerCalled).toBe(false);
    expect(await text(shown.node)).toContain('No such user: bob');
  });

  test('skipLayout を持つファイルはそれを伝える', async () => {
    const shown = await presentInheritedNotFound(
      [async () => ({ default: () => <Line>x</Line>, skipLayout: true })],
      props
    );
    expect(shown.skipLayout).toBe(true);
  });

  test('連鎖が無い (undefined / 空) なら組み込み表示', async () => {
    for (const loaders of [undefined, []]) {
      const shown = await presentInheritedNotFound(loaders, props);
      expect(shown.overridden).toBe(false);
      expect(shown.skipLayout).toBe(false);
      const output = await text(shown.node);
      expect(output).toContain('No such user: bob');
      expect(output).toContain('bobby');
    }
  });
});
