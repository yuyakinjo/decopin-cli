import { readdir, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import type { DynamicParam } from '../types/command.js';

/**
 * ディレクトリエントリの情報
 */
export interface DirectoryEntry {
  /** ファイル/ディレクトリ名 */
  name: string;
  /** フルパス */
  path: string;
  /** 相対パス（appフォルダからの） */
  relativePath: string;
  /** ディレクトリかどうか */
  isDirectory: boolean;
  /** command.tsファイルかどうか */
  isCommand: boolean;
  /** help.tsファイルかどうか */
  isHelp: boolean;
  /** validate.tsファイルかどうか */
  isValidate: boolean;
  /** error.tsファイルかどうか */
  isError: boolean;
  /** params.tsファイルかどうか */
  isParams: boolean;
  /** 動的パラメータかどうか（[id]形式） */
  isDynamic: boolean;
  /** 動的パラメータ情報 */
  dynamicParam?: DynamicParam;
}

/**
 * コマンド構造の情報
 */
export interface CommandStructure {
  /** コマンドパス（例: 'user/create'） */
  path: string;
  /** セグメント（例: ['user', 'create']） */
  segments: string[];
  /** 動的パラメータ */
  dynamicParams: DynamicParam[];
  /** command.tsファイルのパス */
  commandFilePath: string;
  /** help.tsファイルのパス */
  helpFilePath?: string;
  /** validate.tsファイルのパス */
  validateFilePath?: string;
  /** error.tsファイルのパス */
  errorFilePath?: string;
  /** params.tsファイルのパス */
  paramsFilePath?: string;
  /** 深度 */
  depth: number;
}

/**
 * 動的パラメータ形式かチェック
 */
function isDynamicSegment(name: string): boolean {
  return name.startsWith('[') && name.endsWith(']');
}

/**
 * 動的パラメータ情報を解析
 */
function parseDynamicParam(name: string): DynamicParam {
  const content = name.slice(1, -1); // []を除去
  const optional = content.startsWith('...');
  const paramName = optional ? content.slice(3) : content;

  return {
    name: paramName,
    optional,
  };
}

/**
 * ディレクトリエントリを解析
 */
async function parseDirectoryEntry(
  entryPath: string,
  appDir: string
): Promise<DirectoryEntry> {
  const stats = await stat(entryPath);
  const name = basename(entryPath);
  const relativePath = relative(appDir, entryPath);

  const entry: DirectoryEntry = {
    name,
    path: entryPath,
    relativePath,
    isDirectory: stats.isDirectory(),
    isCommand: name === 'command.ts',
    isHelp: name === 'help.ts',
    isValidate: name === 'validate.ts',
    isError: name === 'error.ts',
    isParams: name === 'params.ts',
    isDynamic: isDynamicSegment(name),
  };

  if (entry.isDynamic) {
    entry.dynamicParam = parseDynamicParam(name);
  }

  return entry;
}

/**
 * ディレクトリを再帰的にスキャン
 */
async function scanDirectoryRecursive(
  dirPath: string,
  appDir: string,
  entries: DirectoryEntry[] = []
): Promise<DirectoryEntry[]> {
  try {
    const dirEntries = await readdir(dirPath);

    for (const entryName of dirEntries) {
      const entryPath = join(dirPath, entryName);
      const entry = await parseDirectoryEntry(entryPath, appDir);

      entries.push(entry);

      // ディレクトリの場合は再帰的にスキャン
      if (entry.isDirectory) {
        await scanDirectoryRecursive(entryPath, appDir, entries);
      }
    }
  } catch (error) {
    // ディレクトリが存在しない場合やアクセス権限がない場合は無視
    console.warn(`Failed to scan directory: ${dirPath}`, error);
  }

  return entries;
}

/**
 * command.tsファイルからコマンド構造を構築
 */
function buildCommandStructures(
  entries: DirectoryEntry[],
  appDir: string
): CommandStructure[] {
  const commandFiles = entries.filter((entry) => entry.isCommand);
  const structures: CommandStructure[] = [];

  for (const commandFile of commandFiles) {
    const dirPath = relative(
      appDir,
      commandFile.path.replace('/command.ts', '')
    );
    const segments = dirPath === '' ? [] : dirPath.split('/');
    const dynamicParams: DynamicParam[] = [];

    // セグメントから動的パラメータを抽出
    const processedSegments = segments.map((segment) => {
      if (isDynamicSegment(segment)) {
        const param = parseDynamicParam(segment);
        dynamicParams.push(param);
        return `[${param.name}]`; // 正規化
      }
      return segment;
    });

    const commandPath = processedSegments.join('/');

    // 同じディレクトリ内のhelp.ts、validate.ts、error.ts、params.tsを検索
    const commandDir = commandFile.path.replace('/command.ts', '');
    const helpFile = entries.find(
      (entry) => entry.path === `${commandDir}/help.ts`
    );
    const validateFile = entries.find(
      (entry) => entry.path === `${commandDir}/validate.ts`
    );
    const errorFile = entries.find(
      (entry) => entry.path === `${commandDir}/error.ts`
    );
    const paramsFile = entries.find(
      (entry) => entry.path === `${commandDir}/params.ts`
    );

    const structure: CommandStructure = {
      path: commandPath,
      segments: processedSegments,
      dynamicParams,
      commandFilePath: commandFile.path,
      depth: segments.length,
    };

    if (helpFile) {
      structure.helpFilePath = helpFile.path;
    }

    if (validateFile) {
      structure.validateFilePath = validateFile.path;
    }

    if (errorFile) {
      structure.errorFilePath = errorFile.path;
    }

    if (paramsFile) {
      structure.paramsFilePath = paramsFile.path;
    }

    structures.push(structure);
  }

  return structures.sort((a, b) => a.depth - b.depth);
}

/**
 * appディレクトリをスキャンしてコマンド構造を取得
 */
export async function scanAppDirectory(
  appDir: string
): Promise<CommandStructure[]> {
  try {
    // appディレクトリの存在確認
    await stat(appDir);
  } catch {
    throw new Error(`App directory not found: ${appDir}`);
  }

  const entries = await scanDirectoryRecursive(appDir, appDir);
  const structures = buildCommandStructures(entries, appDir);

  return structures;
}
