/**
 * `app/` を走査して、コマンドとして登録すべきディレクトリを列挙する (ADR 5 の scan)。
 *
 * ファイルの有無がそのまま機能の有無を表すという規約 (test/contract/file-conventions.test.tsx) なので、
 * ここで見つけたファイル名の集合が、後段の全ての判断のもとになる。
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { LEGACY_FILE_NAME as LEGACY_CMD_FILE } from '../../features/conventions/cmd/definition.ts';
import {
  CONVENTION_FILES,
  type ConventionFile,
} from '../../features/conventions/index.ts';
import {
  INHERITED_FILES,
  type InheritedFile,
} from '../../features/inherited/index.ts';
import {
  ROOT_ONLY_FILES,
  type RootOnlyFile,
} from '../../features/root-only/index.ts';

export { CONVENTION_FILES, INHERITED_FILES, ROOT_ONLY_FILES };
export { inheritedChain } from '../../features/inherited/chain.ts';
export type { ConventionFile, InheritedFile, RootOnlyFile };

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
  /**
   * `app/` からの相対ディレクトリ (ルートは空文字) → 継承されるファイル。
   * cmd.tsx を持たないディレクトリも含む (error.tsx だけ置ける)
   */
  inherited: Map<string, Partial<Record<InheritedFile, string>>>;
  /**
   * ディレクトリ (ルートは空文字) → `help.tsx`。
   *
   * help は継承しない (ディレクトリごとに完全一致で引く)。`cmd.tsx` を
   * 持たないディレクトリにも置けるので、Route とは別に持つ
   */
  helpFiles: Map<string, string>;
  /** 旧名で見つかったファイル (ADR 20 の非推奨警告に使う) */
  deprecatedFiles: DeprecatedFile[];
}

export interface DeprecatedFile {
  /** プロジェクトルートからの相対パス */
  file: string;
  /** 使われている旧名 (`command.tsx`) */
  legacy: string;
  /** 使うべき名前 (`cmd.tsx`) */
  current: string;
}

/** `.tsx` を優先する。JSX を使わないコマンドのために `.ts` も許す */
const EXTENSIONS = ['.tsx', '.ts'] as const;

/**
 * 規約ファイルの旧名。新名を優先し、旧名で見つかったら非推奨警告を出す (ADR 20)。
 *
 * 期限は src/deprecations.ts が持っている。旧名を消すときは、ここと合わせて消す
 */
export const LEGACY_FILE_NAMES: Partial<Record<ConventionFile, string>> = {
  cmd: LEGACY_CMD_FILE,
};

/** ルーティングの対象外にするディレクトリ */
function isIgnoredDir(name: string): boolean {
  return (
    name.startsWith('_') || name.startsWith('.') || name === 'node_modules'
  );
}

/**
 * @param base 規約上の名前 (`cmd`, `argv`, ...)
 * @param legacy 旧名も探すか。旧名で見つかった場合は `legacy: true` を返す
 */
function findFile(
  entries: Set<string>,
  base: string,
  legacy?: string
): { file: string; legacy: boolean } | undefined {
  // 新名を全拡張子ぶん試してから旧名に落ちる (新名が常に勝つ)
  for (const [index, name] of [base, legacy].entries()) {
    if (name === undefined) continue;
    for (const extension of EXTENSIONS) {
      const candidate = `${name}${extension}`;
      if (entries.has(candidate)) {
        return { file: candidate, legacy: index > 0 };
      }
    }
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
  const inherited = new Map<string, Partial<Record<InheritedFile, string>>>();
  const helpFiles = new Map<string, string>();
  const deprecatedFiles: DeprecatedFile[] = [];

  const walk = async (dir: string, name: string): Promise<void> => {
    const absolute = join(appDir, dir);
    const dirents = await readdir(absolute, { withFileTypes: true });
    const fileNames = new Set(
      dirents.filter((entry) => entry.isFile()).map((entry) => entry.name)
    );

    const files: Partial<Record<ConventionFile, string>> = {};
    for (const kind of CONVENTION_FILES) {
      const legacy = LEGACY_FILE_NAMES[kind];
      const found = findFile(fileNames, kind, legacy);
      if (found === undefined) continue;
      const file = join(appDir, dir, found.file);
      files[kind] = file;
      if (found.legacy) {
        // 拡張子はそのまま引き継ぐ (command.ts なら cmd.ts に直せばよい)
        deprecatedFiles.push({
          file,
          legacy: found.file,
          current: found.file.replace(`${legacy}.`, `${kind}.`),
        });
      }
    }

    if (dir === '') {
      for (const kind of ROOT_ONLY_FILES) {
        const found = findFile(fileNames, kind);
        if (found !== undefined) {
          rootFiles[kind] = join(appDir, dir, found.file);
        }
      }
    }

    // 継承されるファイルは、コマンドでないディレクトリにも置ける
    const inheritable: Partial<Record<InheritedFile, string>> = {};
    for (const kind of INHERITED_FILES) {
      if (files[kind] !== undefined) inheritable[kind] = files[kind];
    }
    if (Object.keys(inheritable).length > 0) inherited.set(dir, inheritable);

    // help.tsx はコマンドでないディレクトリ (グループ) にも置ける
    if (files.help !== undefined) helpFiles.set(dir, files.help);

    // cmd.tsx を持つディレクトリだけがコマンドになる (test/contract/file-conventions.test.tsx)
    if (files.cmd !== undefined) {
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
  return { routes, rootFiles, inherited, helpFiles, deprecatedFiles };
}
