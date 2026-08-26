/**
 * `.decopin/` に生成するコード (§8 の emit)。
 *
 * ルートごとに動的 import にするのは、実行しないコマンドの
 * モジュール本体を「評価しない」ため (ADR 12。パースは全量走る)。
 */
import { relative } from 'node:path';

import type { Route } from './scanner.ts';

const HEADER = `// このファイルは decopin build が生成します。
// 直接編集しても次のビルドで上書きされます。
`;

/** import 指定子に使えるよう、常に posix 区切りで相対パスにする */
function toSpecifier(outDir: string, file: string): string {
  const path = relative(outDir, file).split('\\').join('/');
  return path.startsWith('.') ? path : `./${path}`;
}

/** ルートに書き出す規約ファイル。Phase が進むごとに増える */
const WIRED_FILES = ['command', 'argv'] as const;

function importer(outDir: string, file: string): string {
  return `() => import(${JSON.stringify(toSpecifier(outDir, file))})`;
}

export interface RoutesInput {
  routes: Route[];
  /** ルート名 → error.tsx の並び (近い順)。§4.4 のフォールバック順 */
  errorChains?: Map<string, string[]>;
  /** app/global-error.tsx */
  globalError?: string;
}

export function generateRoutes(input: RoutesInput, outDir: string): string {
  const entries = input.routes.map((route) => {
    if (route.files.command === undefined) {
      throw new Error(`Route "${route.name}" has no command file`);
    }
    const loaders = WIRED_FILES.flatMap((kind) => {
      const file = route.files[kind];
      if (file === undefined) return [];
      return [`    ${kind}: ${importer(outDir, file)},`];
    });

    const errors = input.errorChains?.get(route.name) ?? [];
    if (errors.length > 0) {
      const list = errors
        .map((file) => `      ${importer(outDir, file)},`)
        .join('\n');
      loaders.push(`    errors: [\n${list}\n    ],`);
    }

    return `  ${JSON.stringify(route.name)}: {\n${loaders.join('\n')}\n  },`;
  });

  const globalError =
    input.globalError === undefined
      ? 'export const globalError = undefined;'
      : `export const globalError = ${importer(outDir, input.globalError)};`;

  return `${HEADER}
import type { RouteTable } from 'decopin-cli';

export const routes = {
${entries.join('\n')}
} satisfies RouteTable;

${globalError}
`;
}

export function generateEntry(program: string): string {
  return `${HEADER}
import { run } from 'decopin-cli';
import { globalError, routes } from './routes.ts';

process.exit(
  await run(routes, { program: ${JSON.stringify(program)}, globalError })
);
`;
}
