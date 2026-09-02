import { describe, expect, test } from 'bun:test';

import { inheritedChain, scan } from '../../src/build/scanner.ts';

const FIXTURE = 'test/fixtures/scan-app';

describe('scan', () => {
  test('cmd ファイルを持つディレクトリだけをコマンドにする', async () => {
    const { routes } = await scan(FIXTURE);
    const names = routes.map((route) => route.name);
    expect(names).toEqual([
      '', // ルートコマンド (app/cmd.tsx)
      'both',
      'cmd-a',
      'legacy',
      'nested/deep',
      'only-ts',
    ]);
  });

  test('ディレクトリの階層がそのままコマンド名になる', async () => {
    const { routes } = await scan(FIXTURE);
    const deep = routes.find((route) => route.name === 'nested/deep');
    expect(deep?.files.cmd).toBe('test/fixtures/scan-app/nested/deep/cmd.tsx');
  });

  test('_ と . で始まるディレクトリは対象外', async () => {
    const { routes } = await scan(FIXTURE);
    const names = routes.map((route) => route.name);
    expect(names).not.toContain('_hidden');
    expect(names).not.toContain('.dot');
  });

  test('cmd 以外の規約ファイルも記録する', async () => {
    const { routes } = await scan(FIXTURE);
    const cmdA = routes.find((route) => route.name === 'cmd-a');
    expect(cmdA?.files.argv).toBe('test/fixtures/scan-app/cmd-a/argv.tsx');
    expect(cmdA?.files.error).toBe('test/fixtures/scan-app/cmd-a/error.tsx');
    expect(cmdA?.files.stdin).toBeUndefined();
  });

  test('JSX を使わないコマンドのために .ts も許す', async () => {
    const { routes } = await scan(FIXTURE);
    const onlyTs = routes.find((route) => route.name === 'only-ts');
    expect(onlyTs?.files.cmd).toBe('test/fixtures/scan-app/only-ts/cmd.ts');
  });

  test('.tsx と .ts が両方あれば .tsx を選ぶ', async () => {
    const { routes } = await scan(FIXTURE);
    const both = routes.find((route) => route.name === 'both');
    expect(both?.files.cmd).toBe('test/fixtures/scan-app/both/cmd.tsx');
  });

  test('ルート直下だけに置けるファイルを分けて拾う', async () => {
    const { rootFiles } = await scan(FIXTURE);
    expect(rootFiles.env).toBe('test/fixtures/scan-app/env.ts');
    expect(rootFiles.version).toBe('test/fixtures/scan-app/version.ts');
    expect(rootFiles['global-error']).toBeUndefined();
  });

  test('argv.tsx だけのディレクトリはコマンドにならない', async () => {
    const { routes } = await scan(FIXTURE);
    expect(routes.map((route) => route.name)).not.toContain('no-command');
  });

  test('旧名 (command.tsx) でもコマンドとして拾う (ADR 20)', async () => {
    const { routes } = await scan(FIXTURE);
    const legacy = routes.find((route) => route.name === 'legacy');
    expect(legacy?.files.cmd).toBe('test/fixtures/scan-app/legacy/command.tsx');
  });

  test('旧名で見つかったものは deprecatedFiles に載せる', async () => {
    const { deprecatedFiles } = await scan(FIXTURE);
    expect(deprecatedFiles).toEqual([
      {
        file: 'test/fixtures/scan-app/legacy/command.tsx',
        legacy: 'command.tsx',
        current: 'cmd.tsx',
      },
    ]);
  });

  test('新名があれば旧名は見ない', async () => {
    // both/ には cmd.tsx と cmd.ts があるだけなので、旧名の警告は出ない
    const { deprecatedFiles } = await scan(FIXTURE);
    expect(deprecatedFiles.map((d) => d.file)).not.toContain(
      'test/fixtures/scan-app/both/command.tsx'
    );
  });

  test('継承されるファイルはコマンドでないディレクトリからも拾う', async () => {
    const { inherited } = await scan(FIXTURE);
    expect(inherited.get('cmd-a')).toEqual({
      error: 'test/fixtures/scan-app/cmd-a/error.tsx',
    });
  });
});

describe('inheritedChain', () => {
  test('近い順 (自分 → 親 → ルート) に並べる', async () => {
    const { inherited } = await scan(FIXTURE);
    inherited.set('', { error: 'root/error.tsx' });
    inherited.set('a', { error: 'a/error.tsx' });
    inherited.set('a/b', { error: 'a/b/error.tsx' });
    expect(inheritedChain(inherited, 'a/b/c', 'error')).toEqual([
      'a/b/error.tsx',
      'a/error.tsx',
      'root/error.tsx',
    ]);
  });

  test('無い階層は飛ばす', async () => {
    const { inherited } = await scan(FIXTURE);
    inherited.clear();
    inherited.set('', { error: 'root/error.tsx' });
    expect(inheritedChain(inherited, 'a/b', 'error')).toEqual([
      'root/error.tsx',
    ]);
  });

  test('該当が無ければ空', async () => {
    const { inherited } = await scan(FIXTURE);
    inherited.clear();
    expect(inheritedChain(inherited, 'a/b', 'layout')).toEqual([]);
  });
});
