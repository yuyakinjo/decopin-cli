import type { InheritedFile } from './index.ts';

/** 継承チェーンの組み立てに必要なルート情報だけを表す。 */
export interface InheritedRoute {
  name: string;
  dir: string;
}

/** ディレクトリごとに見つかった継承ファイル。 */
export type InheritedFilesByDirectory = ReadonlyMap<
  string,
  Partial<Record<InheritedFile, string>>
>;

/**
 * あるディレクトリから見た、継承ファイルの並び。**近い順** (自分 → 親 → ...)。
 *
 * `error.tsx` はこの順に試す (近い順)。`layout.tsx` は逆順に包む (ADR 7)。
 */
export function inheritedChain(
  inherited: InheritedFilesByDirectory,
  dir: string,
  kind: InheritedFile
): string[] {
  const chain: string[] = [];
  const segments = dir === '' ? [] : dir.split('/');
  for (let depth = segments.length; depth >= 0; depth -= 1) {
    const file = inherited.get(segments.slice(0, depth).join('/'))?.[kind];
    if (file !== undefined) chain.push(file);
  }
  return chain;
}

/**
 * 全ルートについて、指定した継承ファイルの読み込み順を組み立てる。
 * scanner は常に近い順で返し、各機能が実行時に必要な順序へ揃える。
 */
export function createInheritedChains(
  routes: readonly InheritedRoute[],
  inherited: InheritedFilesByDirectory,
  kind: InheritedFile,
  order: 'nearest-first' | 'outer-first'
): Map<string, string[]> {
  return new Map(
    routes.map((route) => {
      const files = inheritedChain(inherited, route.dir, kind);
      return [
        route.name,
        order === 'nearest-first' ? files : [...files].reverse(),
      ];
    })
  );
}
