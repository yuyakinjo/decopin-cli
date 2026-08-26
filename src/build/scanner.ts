/**
 * `app/` を走査して、コマンドとして登録すべきディレクトリを列挙する (§8 の scan)。
 *
 * ファイルの有無がそのまま機能の有無を表すという規約 (§3) なので、
 * ここで見つけたファイル名の集合が、後段の全ての判断のもとになる。
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** 規約で定められたファイルの種類 */
export const CONVENTION_FILES = [
  'command',
  'argv',
  'stdin',
  'error',
  'layout',
  'middleware',
  'help',
] as const;

export type ConventionFile = (typeof CONVENTION_FILES)[number];

/** ルート直下にだけ置けるファイル */
export const ROOT_ONLY_FILES = ['global-error', 'env', 'version'] as const;

export type RootOnlyFile = (typeof ROOT_ONLY_FILES)[number];

export interface Route {
  /** コマンド名。`hello`, `user/create`。ルートコマンドは空文字 */
  name: string;
  /** `app/` からの相対ディレクトリ。ルートは空文字 */
  dir: string;
  /** 見つかった規約ファイル (プロジェクトルートからの相対パス) */
  files: Partial<Record<ConventionFile, string>>;
}

export interface ScanResult {
  routes: Route[];
  /** ルート直下にだけ置けるファイル */
  rootFiles: Partial<Record<RootOnlyFile, string>>;
}

/** `.tsx` を優先する。JSX を使わないコマンドのために `.ts` も許す */
const EXTENSIONS = ['.tsx', '.ts'] as const;

/** ルーティングの対象外にするディレクトリ */
function isIgnoredDir(name: string): boolean {
  return (
    name.startsWith('_') || name.startsWith('.') || name === 'node_modules'
  );
}

function findFile(
  entries: Set<string>,
  base: string
): { file: string } | undefined {
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (entries.has(candidate)) return { file: candidate };
  }
  return undefined;
}

/**
 * @param appDir `app/` の位置
 * @returns ルート名の昇順で並んだコマンド一覧 (出力を決定的にするため)
 */
export async function scan(appDir: string): Promise<ScanResult> {
  const routes: Route[] = [];
  const rootFiles: Partial<Record<RootOnlyFile, string>> = {};

  const walk = async (dir: string, name: string): Promise<void> => {
    const absolute = join(appDir, dir);
    const dirents = await readdir(absolute, { withFileTypes: true });
    const fileNames = new Set(
      dirents.filter((entry) => entry.isFile()).map((entry) => entry.name)
    );

    const files: Partial<Record<ConventionFile, string>> = {};
    for (const kind of CONVENTION_FILES) {
      const found = findFile(fileNames, kind);
      if (found !== undefined) files[kind] = join(appDir, dir, found.file);
    }

    if (dir === '') {
      for (const kind of ROOT_ONLY_FILES) {
        const found = findFile(fileNames, kind);
        if (found !== undefined) {
          rootFiles[kind] = join(appDir, dir, found.file);
        }
      }
    }

    // command.tsx を持つディレクトリだけがコマンドになる (§3)
    if (files.command !== undefined) {
      routes.push({ name, dir, files });
    }

    for (const entry of dirents) {
      if (!entry.isDirectory() || isIgnoredDir(entry.name)) continue;
      await walk(
        dir === '' ? entry.name : `${dir}/${entry.name}`,
        name === '' ? entry.name : `${name}/${entry.name}`
      );
    }
  };

  await walk('', '');
  routes.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { routes, rootFiles };
}
