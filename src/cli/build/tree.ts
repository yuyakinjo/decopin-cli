import { basename } from 'node:path';

import type { Route } from '../../core/build/scanner.ts';
import type { ScanResult } from '../../core/build/scanner.ts';
import { CONVENTION_FILES } from '../../features/conventions/index.ts';
import { inheritedChain } from '../../features/inherited/chain.ts';
import type { InheritedFilesByDirectory } from '../../features/inherited/chain.ts';
import { INHERITED_FILES } from '../../features/inherited/index.ts';
import { ROOT_ONLY_FILES } from '../../features/root-only/index.ts';

export interface TreeInput {
  appDir: string;
  routes: readonly Route[];
  rootFiles: ScanResult['rootFiles'];
  inherited: InheritedFilesByDirectory;
}

/** ルートコマンド (app/cmd.tsx) の見出し。名前が空文字なので代わりに出す */
const ROOT_COMMAND = '(root)';

/**
 * 自分のディレクトリに置かれたファイル。
 *
 * 並びは `CONVENTION_FILES` の順。アルファベット順にすると、読む順序
 * (argv → stdin → data → cmd) と関係のない並びになる
 */
function ownFiles(route: Route): string[] {
  return CONVENTION_FILES.flatMap((kind) => {
    const file = route.files[kind];
    return file === undefined ? [] : [basename(file)];
  });
}

/**
 * 上のディレクトリから効いているファイル。**近い順**。
 *
 * 2 つ外す。自分のディレクトリにあるものは `ownFiles` が既に挙げている。
 * app/ 直下の `not-found.tsx` のように Root の行に出るものも外す
 * (全コマンドに効くので、全コマンドの行に書くと 1 件も情報が増えない)。
 *
 * 表示は app/ からの相対パス。`layout.tsx` だけでは、どの階層の layout
 * なのかが分からない
 */
function inheritedFiles(
  route: Route,
  inherited: InheritedFilesByDirectory,
  rootFiles: ScanResult['rootFiles'],
  appDir: string
): string[] {
  const elsewhere = new Set([
    ...Object.values(route.files),
    ...Object.values(rootFiles),
  ]);
  const prefix = appDir.endsWith('/') ? appDir : `${appDir}/`;
  return INHERITED_FILES.flatMap((kind) =>
    inheritedChain(inherited, route.dir, kind)
      .filter((file) => !elsewhere.has(file))
      .map((file) =>
        file.startsWith(prefix) ? file.slice(prefix.length) : file
      )
  );
}

/**
 * コマンドごとに、それを組み立てているファイルを木にする (ADR 47)。
 *
 * 1 コマンド = 1 ノード。`app/` の階層ではなくコマンド名で並べるのは、
 * 打つ側から見える単位がコマンドだから。継承ファイルは `↑` を付けて
 * 同じノードに出す (どこから来たかまで書かないと直しに行けない)
 */
export function commandTree(input: TreeInput): string {
  const { appDir, routes, rootFiles, inherited } = input;
  const lines: string[] = [`Route (${appDir})`];

  routes.forEach((route, index) => {
    const first = index === 0;
    const last = index === routes.length - 1;
    // 1 つしかないときに ┌ だけ出すと、閉じていない木に見える
    const head = routes.length === 1 ? '─' : first ? '┌' : last ? '└' : '├';
    const rail = last ? ' ' : '│';
    lines.push(`${head} ${route.name || ROOT_COMMAND}`);
    lines.push(`${rail}   ${ownFiles(route).join('  ')}`);
    const above = inheritedFiles(route, inherited, rootFiles, appDir);
    if (above.length > 0) lines.push(`${rail}   ↑ ${above.join('  ')}`);
  });

  const root = ROOT_ONLY_FILES.flatMap((kind) => {
    const file = rootFiles[kind];
    return file === undefined ? [] : [basename(file)];
  });
  if (root.length > 0) {
    lines.push('', `Root (${appDir})`, `    ${root.join('  ')}`);
  }
  return `${lines.join('\n')}\n`;
}
