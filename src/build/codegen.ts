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

export function generateRoutes(routes: Route[], outDir: string): string {
  const entries = routes.map((route) => {
    const command = route.files.command;
    if (command === undefined) {
      throw new Error(`command ファイルのないルートです: ${route.name}`);
    }
    return `  ${JSON.stringify(route.name)}: () => import(${JSON.stringify(
      toSpecifier(outDir, command)
    )}),`;
  });

  return `${HEADER}
export const routes = {
${entries.join('\n')}
} satisfies Record<string, () => Promise<unknown>>;
`;
}

export function generateEntry(): string {
  return `${HEADER}
import { run } from 'decopin-cli';
import { routes } from './routes.ts';

process.exit(await run(routes));
`;
}
