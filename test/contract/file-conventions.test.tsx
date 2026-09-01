/**
 * 契約: ファイルの有無 = 機能の有無。
 *
 * このフレームワークの一番外側の約束。どのファイルが何を有効にし、
 * 上位ディレクトリから継承されるのはどれか、を表として固定する。
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CONVENTION_FILES,
  INHERITED_FILES,
  ROOT_ONLY_FILES,
  inheritedChain,
  scan,
} from '../../src/build/scanner.ts';

const dirs: string[] = [];

afterAll(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

/** ファイルの並びから app/ を組み立てる */
async function appDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'decopin-conv-'));
  dirs.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(dir, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await Bun.write(absolute, content);
  }
  return dir;
}

const NOOP = 'export default function X() {\n  return null;\n}\n';

describe('置ける場所', () => {
  test('コマンドのディレクトリに置けるファイル', () => {
    expect([...CONVENTION_FILES]).toEqual([
      'command',
      'argv',
      'stdin',
      'data',
      'error',
      'layout',
      'middleware',
      'help',
    ]);
  });

  test('ルート直下にだけ置けるファイル', () => {
    expect([...ROOT_ONLY_FILES]).toEqual([
      'global-error',
      'not-found',
      'env',
      'version',
    ]);
  });

  test('上位ディレクトリから継承されるファイル', () => {
    // help は継承しない (ディレクトリごとに完全一致で引く)
    expect([...INHERITED_FILES]).toEqual(['error', 'layout', 'middleware']);
  });
});

describe('command ファイルの有無', () => {
  test('command があるディレクトリだけがコマンドになる', async () => {
    const dir = await appDir({
      'hello/command.tsx': NOOP,
      'only-argv/argv.tsx': NOOP,
    });
    const { routes } = await scan(dir);
    expect(routes.map((route) => route.name)).toEqual(['hello']);
  });

  test('.tsx が無ければ .ts でもよい (.tsx を優先)', async () => {
    const dir = await appDir({
      'a/command.ts': NOOP,
      'b/command.ts': NOOP,
      'b/command.tsx': NOOP,
    });
    const { routes } = await scan(dir);
    expect(routes[0]?.files.command).toContain('a/command.ts');
    expect(routes[1]?.files.command).toContain('b/command.tsx');
  });

  test('_ と . で始まるディレクトリは対象外', async () => {
    const dir = await appDir({
      'ok/command.tsx': NOOP,
      '_shared/command.tsx': NOOP,
      '.hidden/command.tsx': NOOP,
    });
    const { routes } = await scan(dir);
    expect(routes.map((route) => route.name)).toEqual(['ok']);
  });

  test('ディレクトリの階層がコマンド名になる (ルートは空文字)', async () => {
    const dir = await appDir({
      'command.tsx': NOOP,
      'user/create/command.tsx': NOOP,
    });
    const { routes } = await scan(dir);
    expect(routes.map((route) => route.name)).toEqual(['', 'user/create']);
  });
});

describe('継承', () => {
  test('error / layout / middleware は近い順に辿れる', async () => {
    const dir = await appDir({
      'error.tsx': NOOP,
      'user/error.tsx': NOOP,
      'user/list/command.tsx': NOOP,
    });
    const { inherited } = await scan(dir);
    const chain = inheritedChain(inherited, 'user/list', 'error');
    expect(chain).toHaveLength(2);
    expect(chain[0]).toContain('user/error.tsx');
    expect(chain[1]).toContain('/error.tsx');
  });

  test('command を持たないディレクトリの継承ファイルも拾う', async () => {
    const dir = await appDir({
      'user/layout.tsx': NOOP,
      'user/list/command.tsx': NOOP,
    });
    const { inherited, routes } = await scan(dir);
    expect(routes.map((route) => route.name)).toEqual(['user/list']);
    expect(inherited.get('user')?.layout).toContain('user/layout.tsx');
  });

  test('help は継承しない (ディレクトリごとに完全一致)', async () => {
    const dir = await appDir({
      'help.tsx': NOOP,
      'user/help.tsx': NOOP,
      'user/list/command.tsx': NOOP,
    });
    const { helpFiles } = await scan(dir);
    expect([...helpFiles.keys()].sort()).toEqual(['', 'user']);
    expect(helpFiles.has('user/list')).toBe(false);
  });
});
