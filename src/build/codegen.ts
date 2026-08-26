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

export function generateRoutes(routes: Route[], outDir: string): string {
  const entries = routes.map((route) => {
    if (route.files.command === undefined) {
      throw new Error(`Route "${route.name}" has no command file`);
    }
    const loaders = WIRED_FILES.flatMap((kind) => {
      const file = route.files[kind];
      if (file === undefined) return [];
      return [
        `    ${kind}: () => import(${JSON.stringify(
          toSpecifier(outDir, file)
        )}),`,
      ];
    });
    return `  ${JSON.stringify(route.name)}: {\n${loaders.join('\n')}\n  },`;
  });

  return `${HEADER}
import type { RouteTable } from 'decopin-cli';

export const routes = {
${entries.join('\n')}
} satisfies RouteTable;
`;
}

export function generateEntry(program: string): string {
  return `${HEADER}
import { run } from 'decopin-cli';
import { routes } from './routes.ts';

process.exit(await run(routes, { program: ${JSON.stringify(program)} }));
`;
}
