import { describe, expect, test } from 'bun:test';

import { generateEntry, generateRoutes } from '../../src/build/codegen.ts';
import type { Route } from '../../src/build/scanner.ts';

const routes: Route[] = [
  {
    name: 'hello',
    dir: 'hello',
    files: { command: 'app/hello/command.tsx' },
  },
  {
    name: 'user/create',
    dir: 'user/create',
    files: { command: 'app/user/create/command.tsx' },
  },
];

describe('generateRoutes', () => {
  test('ルートごとに動的 import を並べる', () => {
    const code = generateRoutes(routes, '.decopin');
    expect(code).toContain(
      '"hello": () => import("../app/hello/command.tsx"),'
    );
    expect(code).toContain(
      '"user/create": () => import("../app/user/create/command.tsx"),'
    );
  });

  test('生成物であることを先頭に書く', () => {
    expect(generateRoutes(routes, '.decopin')).toContain(
      'decopin build が生成します'
    );
  });

  test('command のないルートは作れない', () => {
    expect(() =>
      generateRoutes([{ name: 'x', dir: 'x', files: {} }], '.decopin')
    ).toThrow(/command ファイルのないルート/);
  });
});

describe('generateEntry', () => {
  test('routes を run に渡し、終了コードで exit する', () => {
    const code = generateEntry();
    expect(code).toContain("import { run } from 'decopin-cli';");
    expect(code).toContain('process.exit(await run(routes));');
  });
});
