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
    const code = generateRoutes({ routes }, '.decopin');
    expect(code).toContain(
      'command: () => import("../app/hello/command.tsx"),'
    );
    expect(code).toContain(
      'command: () => import("../app/user/create/command.tsx"),'
    );
  });

  test('argv.tsx があれば一緒に配線する', () => {
    const code = generateRoutes(
      {
        routes: [
          {
            name: 'hello',
            dir: 'hello',
            files: {
              command: 'app/hello/command.tsx',
              argv: 'app/hello/argv.tsx',
            },
          },
        ],
      },
      '.decopin'
    );
    expect(code).toContain('argv: () => import("../app/hello/argv.tsx"),');
  });

  test('argv.tsx がなければ command だけを書く', () => {
    const code = generateRoutes({ routes }, '.decopin');
    expect(code).not.toContain('argv:');
  });

  test('生成物であることを先頭に書く', () => {
    expect(generateRoutes({ routes }, '.decopin')).toContain(
      'decopin build が生成します'
    );
  });

  test('command のないルートは作れない', () => {
    expect(() =>
      generateRoutes(
        { routes: [{ name: 'x', dir: 'x', files: {} }] },
        '.decopin'
      )
    ).toThrow(/has no command file/);
  });
});

describe('generateRoutes — error.tsx の連鎖', () => {
  test('近い順に error.tsx を並べる', () => {
    const code = generateRoutes(
      {
        routes,
        errorChains: new Map([
          ['user/create', ['app/user/create/error.tsx', 'app/user/error.tsx']],
        ]),
      },
      '.decopin'
    );
    const errors = code.slice(code.indexOf('errors: ['));
    expect(errors.indexOf('user/create/error.tsx')).toBeLessThan(
      errors.indexOf('user/error.tsx')
    );
  });

  test('error.tsx が無いルートには errors を書かない', () => {
    const code = generateRoutes({ routes }, '.decopin');
    expect(code).not.toContain('errors:');
  });

  test('global-error.tsx を別に export する', () => {
    expect(
      generateRoutes(
        { routes, globalError: 'app/global-error.tsx' },
        '.decopin'
      )
    ).toContain(
      'export const globalError = () => import("../app/global-error.tsx");'
    );
  });

  test('global-error.tsx が無ければ undefined', () => {
    expect(generateRoutes({ routes }, '.decopin')).toContain(
      'export const globalError = undefined;'
    );
  });
});

describe('generateRoutes — layout / middleware の連鎖', () => {
  test('layout は外側から順に並べる', () => {
    const code = generateRoutes(
      {
        routes,
        layoutChains: new Map([
          ['user/create', ['app/layout.tsx', 'app/user/layout.tsx']],
        ]),
      },
      '.decopin'
    );
    const layouts = code.slice(code.indexOf('layouts: ['));
    expect(layouts.indexOf('"../app/layout.tsx"')).toBeLessThan(
      layouts.indexOf('"../app/user/layout.tsx"')
    );
  });

  test('middleware も外側から順に並べる', () => {
    const code = generateRoutes(
      {
        routes,
        middlewareChains: new Map([
          ['hello', ['app/middleware.tsx', 'app/hello/middleware.tsx']],
        ]),
      },
      '.decopin'
    );
    const middlewares = code.slice(code.indexOf('middlewares: ['));
    expect(middlewares.indexOf('"../app/middleware.tsx"')).toBeLessThan(
      middlewares.indexOf('"../app/hello/middleware.tsx"')
    );
  });

  test('該当が無ければ書かない', () => {
    const code = generateRoutes({ routes }, '.decopin');
    expect(code).not.toContain('layouts:');
    expect(code).not.toContain('middlewares:');
  });
});

describe('generateEntry', () => {
  test('routes を run に渡し、終了コードで exit する', () => {
    const code = generateEntry('mycli');
    expect(code).toContain("import { run } from 'decopin-cli';");
    expect(code).toContain('program: "mycli", globalError');
  });
});
