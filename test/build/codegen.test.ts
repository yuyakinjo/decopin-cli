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
      'command: () => import("../app/hello/command.tsx"),'
    );
    expect(code).toContain(
      'command: () => import("../app/user/create/command.tsx"),'
    );
  });

  test('argv.tsx があれば一緒に配線する', () => {
    const code = generateRoutes(
      [
        {
          name: 'hello',
          dir: 'hello',
          files: {
            command: 'app/hello/command.tsx',
            argv: 'app/hello/argv.tsx',
          },
        },
      ],
      '.decopin'
    );
    expect(code).toContain('argv: () => import("../app/hello/argv.tsx"),');
  });

  test('argv.tsx がなければ command だけを書く', () => {
    const code = generateRoutes(routes, '.decopin');
    expect(code).not.toContain('argv:');
  });

  test('生成物であることを先頭に書く', () => {
    expect(generateRoutes(routes, '.decopin')).toContain(
      'decopin build が生成します'
    );
  });

  test('command のないルートは作れない', () => {
    expect(() =>
      generateRoutes([{ name: 'x', dir: 'x', files: {} }], '.decopin')
    ).toThrow(/has no command file/);
  });
});

describe('generateEntry', () => {
  test('routes を run に渡し、終了コードで exit する', () => {
    const code = generateEntry('mycli');
    expect(code).toContain("import { run } from 'decopin-cli';");
    expect(code).toContain(
      'process.exit(await run(routes, { program: "mycli" }));'
    );
  });
});
