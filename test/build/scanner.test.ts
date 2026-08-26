import { describe, expect, test } from 'bun:test';

import { scan } from '../../src/build/scanner.ts';

const FIXTURE = 'test/fixtures/scan-app';

describe('scan', () => {
  test('command ファイルを持つディレクトリだけをコマンドにする', async () => {
    const { routes } = await scan(FIXTURE);
    const names = routes.map((route) => route.name);
    expect(names).toEqual([
      '', // ルートコマンド (app/command.tsx)
      'both',
      'cmd-a',
      'nested/deep',
      'only-ts',
    ]);
  });

  test('ディレクトリの階層がそのままコマンド名になる', async () => {
    const { routes } = await scan(FIXTURE);
    const deep = routes.find((route) => route.name === 'nested/deep');
    expect(deep?.files.command).toBe(
      'test/fixtures/scan-app/nested/deep/command.tsx'
    );
  });

  test('_ と . で始まるディレクトリは対象外', async () => {
    const { routes } = await scan(FIXTURE);
    const names = routes.map((route) => route.name);
    expect(names).not.toContain('_hidden');
    expect(names).not.toContain('.dot');
  });

  test('command 以外の規約ファイルも記録する', async () => {
    const { routes } = await scan(FIXTURE);
    const cmdA = routes.find((route) => route.name === 'cmd-a');
    expect(cmdA?.files.argv).toBe('test/fixtures/scan-app/cmd-a/argv.tsx');
    expect(cmdA?.files.error).toBe('test/fixtures/scan-app/cmd-a/error.tsx');
    expect(cmdA?.files.stdin).toBeUndefined();
  });

  test('JSX を使わないコマンドのために .ts も許す', async () => {
    const { routes } = await scan(FIXTURE);
    const onlyTs = routes.find((route) => route.name === 'only-ts');
    expect(onlyTs?.files.command).toBe(
      'test/fixtures/scan-app/only-ts/command.ts'
    );
  });

  test('.tsx と .ts が両方あれば .tsx を選ぶ', async () => {
    const { routes } = await scan(FIXTURE);
    const both = routes.find((route) => route.name === 'both');
    expect(both?.files.command).toBe('test/fixtures/scan-app/both/command.tsx');
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
});
