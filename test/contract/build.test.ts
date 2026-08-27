/**
 * 契約: ビルドが生成するもの。
 *
 * `.decopin/` の中身は「実行時に何が配線されているか」の答えなので、
 * ここで形を固定する。
 */
import { describe, expect, test } from 'bun:test';

import { generateEntry, generateRoutes } from '../../src/build/codegen.ts';
import type { Route } from '../../src/build/scanner.ts';

const routes: Route[] = [
  {
    name: 'hello',
    dir: 'hello',
    files: {
      command: 'app/hello/command.tsx',
      argv: 'app/hello/argv.tsx',
      stdin: 'app/hello/stdin.tsx',
    },
  },
];

describe('routes.ts', () => {
  const code = generateRoutes(
    {
      routes,
      errorChains: new Map([['hello', ['app/hello/error.tsx']]]),
      layoutChains: new Map([['hello', ['app/layout.tsx']]]),
      middlewareChains: new Map([['hello', ['app/middleware.tsx']]]),
      helpFiles: new Map([
        ['', 'app/help.tsx'],
        ['hello', 'app/hello/help.tsx'],
      ]),
      globalError: 'app/global-error.tsx',
      notFound: 'app/not-found.tsx',
      env: 'app/env.tsx',
      version: 'app/version.tsx',
    },
    '.decopin'
  );

  test('ルートごとに動的 import を並べる (実行しないコマンドを評価しない)', () => {
    for (const kind of ['command', 'argv', 'stdin']) {
      expect(code).toContain(
        `${kind}: () => import("../app/hello/${kind}.tsx")`
      );
    }
  });

  test('継承する規約は配列で、error は近い順・layout は外側から', () => {
    expect(code).toContain('errors: [');
    expect(code).toContain('layouts: [');
    expect(code).toContain('middlewares: [');
  });

  test('help はディレクトリをキーにした別のマップ', () => {
    expect(code).toContain('export const helps');
    expect(code).toContain('"": () => import("../app/help.tsx")');
    expect(code).toContain('"hello": () => import("../app/hello/help.tsx")');
  });

  test('ルート直下のファイルは名前付き export', () => {
    for (const name of ['globalError', 'notFound', 'envFile', 'versionFile']) {
      expect(code).toContain(`export const ${name} = () => import(`);
    }
  });

  test('置かれていないファイルは undefined になる', () => {
    const bare = generateRoutes({ routes }, '.decopin');
    for (const name of ['globalError', 'notFound', 'envFile', 'versionFile']) {
      expect(bare).toContain(`export const ${name} = undefined;`);
    }
    // helps は entry.ts が必ず import するので、空でも export される
    expect(bare).toContain(
      'export const helps: Record<string, () => Promise<unknown>> = {};'
    );
  });
});

describe('entry.ts', () => {
  const code = generateEntry('mycli');

  test('SIGINT を 130 で終わらせる (Bun はハンドラなしだと 0 で終わる)', () => {
    expect(code).toContain("process.on('SIGINT', () => process.exit(130))");
  });

  test('run の戻り値をそのまま終了コードにする', () => {
    expect(code).toContain('process.exit(');
    expect(code).toContain('await run(routes, {');
  });

  test('help に出す名前をビルド時に埋め込む (実行時に推測しない)', () => {
    expect(code).toContain('program: "mycli"');
  });

  test('生成物であることを先頭に書く', () => {
    expect(
      code.startsWith('// このファイルは decopin build が生成します。')
    ).toBe(true);
  });
});
