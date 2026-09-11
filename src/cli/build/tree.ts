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
  /** UTF-8 でない端末では記号を ASCII に落とす */
  unicode?: boolean;
}

/** ルートコマンド (app/cmd.tsx) の見出し。名前が空文字なので代わりに出す */
const ROOT_COMMAND = '(root)';

/**
 * 木の記号。`SYMBOLS` (src/core/renderer/data.ts) と同じく unicode/ascii の対。
 *
 * ファイル名の前に置く 3 つは、どれも 1 桁の文字にしてある。絵文字は幅が
 * 2 桁で、異体字セレクタの有無でも変わるので採らなかった (§width.ts)
 */
const GLYPHS = {
  unicode: {
    convention: 'ƒ',
    inherited: '↑',
    rootOnly: '¤',
    only: '─',
    first: '┌',
    middle: '├',
    last: '└',
    rail: '│',
  },
  ascii: {
    convention: 'f',
    inherited: '^',
    rootOnly: '*',
    only: '-',
    first: '+',
    middle: '+',
    last: '+',
    rail: '|',
  },
} as const;

type Glyphs = Record<keyof (typeof GLYPHS)['unicode'], string>;

/**
 * 自分のディレクトリに置かれたファイル。
 *
 * 並びは `CONVENTION_FILES` の順。アルファベット順にすると、読む順序
 * (argv → stdin → data → cmd) と関係のない並びになる
 */
function ownFiles(route: Route, glyphs: Glyphs): string[] {
  return CONVENTION_FILES.flatMap((kind) => {
    const file = route.files[kind];
    return file === undefined ? [] : [`${glyphs.convention} ${basename(file)}`];
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
  appDir: string,
  glyphs: Glyphs
): string[] {
  const elsewhere = new Set([
    ...Object.values(route.files),
    ...Object.values(rootFiles),
  ]);
  const prefix = appDir.endsWith('/') ? appDir : `${appDir}/`;
  return INHERITED_FILES.flatMap((kind) =>
    inheritedChain(inherited, route.dir, kind)
      .filter((file) => !elsewhere.has(file))
      .map((file) => {
        const shown = file.startsWith(prefix)
          ? file.slice(prefix.length)
          : file;
        return `${glyphs.inherited} ${shown}`;
      })
  );
}

/** 記号の読み方。Next.js と同じく木の下に置く */
function legend(glyphs: Glyphs): string[] {
  return [
    `${glyphs.convention}  convention   placed in the command's own directory`,
    `${glyphs.inherited}  inherited    comes from a directory above`,
    `${glyphs.rootOnly}  root-only    applies to every command`,
  ];
}

/**
 * コマンドごとに、それを組み立てているファイルを木にする (ADR 47)。
 *
 * 1 コマンド = 1 ノード。`app/` の階層ではなくコマンド名で並べるのは、
 * 打つ側から見える単位がコマンドだから。自分のファイルと継承ファイルは
 * 同じ行に並べ、どちらなのかは行の位置ではなく記号で示す。継承には
 * どこから来たかまで書く (書かないと直しに行けない)
 */
export function commandTree(input: TreeInput): string {
  const { appDir, routes, rootFiles, inherited, unicode = true } = input;
  const glyphs = unicode ? GLYPHS.unicode : GLYPHS.ascii;
  const lines: string[] = [`Route (${appDir})`];

  routes.forEach((route, index) => {
    const first = index === 0;
    const last = index === routes.length - 1;
    // 1 つしかないときに ┌ だけ出すと、閉じていない木に見える
    const head =
      routes.length === 1
        ? glyphs.only
        : first
          ? glyphs.first
          : last
            ? glyphs.last
            : glyphs.middle;
    const rail = last ? ' ' : glyphs.rail;
    const files = [
      ...ownFiles(route, glyphs),
      ...inheritedFiles(route, inherited, rootFiles, appDir, glyphs),
    ];
    lines.push(`${head} ${route.name || ROOT_COMMAND}`);
    lines.push(`${rail}   ${files.join('  ')}`);
  });

  const root = ROOT_ONLY_FILES.flatMap((kind) => {
    const file = rootFiles[kind];
    return file === undefined ? [] : [`${glyphs.rootOnly} ${basename(file)}`];
  });
  if (root.length > 0) {
    lines.push('', `Root (${appDir})`, `    ${root.join('  ')}`);
  }
  lines.push('', ...legend(glyphs));
  return `${lines.join('\n')}\n`;
}
