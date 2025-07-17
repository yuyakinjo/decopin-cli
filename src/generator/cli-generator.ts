import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParsedASTResult } from '../parser/ast-parser.js';
import { parseHelpFile } from '../parser/ast-parser.js';
import { getVersionInfo } from '../parser/version-parser.js';
import type { CommandStructure } from '../scanner/directory-scanner.js';
import type { ParsedCommand } from '../types/command.js';
import { generateMainCLITemplate } from './template-generator.js';
import { generateTypeDefinitions } from './type-generator.js';

/**
 * CLI生成設定
 */
export interface GeneratorConfig {
  /** 出力ディレクトリ */
  outputDir: string;
  /** CLI名 */
  cliName: string;
  /** appディレクトリのパス */
  appDir: string;
  /** 出力ファイル名（デフォルト: 'cli.js'） */
  outputFileName?: string;
  /** バージョン */
  version?: string;
  /** 説明 */
  description?: string;
}

/**
 * 生成結果
 */
export interface GeneratedFiles {
  /** メインCLIファイル */
  mainFile: string;
  /** 型定義ファイル */
  typesFile: string;
  /** 生成されたファイル一覧 */
  files: string[];
}

/**
 * CLIを生成
 */
export async function generateCLI(
  config: GeneratorConfig,
  commands: ParsedCommand[]
): Promise<GeneratedFiles> {
  const files: string[] = [];

  // app/version.tsからバージョン情報を取得
  const versionInfo = await getVersionInfo(config.appDir, config.version);

  // メインCLIファイルを生成
  const mainCLICode = generateMainCLITemplate(config, commands, versionInfo);
  const fileName = config.outputFileName || 'cli.js';
  const mainFile = join(config.outputDir, fileName);
  await writeFile(mainFile, mainCLICode, 'utf-8');
  files.push(mainFile);

  // 型定義ファイルを生成
  const typeDefinitions = generateTypeDefinitions(commands);
  const typesFile = join(config.outputDir, 'types.d.ts');
  await writeFile(typesFile, typeDefinitions, 'utf-8');
  files.push(typesFile);

  return {
    mainFile,
    typesFile,
    files,
  };
}

/**
 * help.tsからメタデータを読み込むための専用関数
 */
async function loadHelpMetadata(filePath: string | undefined) {
  // ファイルパスがなければ、何もせず null を返す (ガード節)
  if (!filePath) {
    return null;
  }

  const helpResult = await parseHelpFile(filePath);

  // エラーがあれば警告を表示する
  if (helpResult.errors.length > 0) {
    console.warn(`Errors in ${filePath}:`, helpResult.errors);
  }

  // help.ts の解析結果からメタデータがあれば、整形して返す
  if (helpResult.help) {
    return {
      name: helpResult.help.name,
      description: helpResult.help.description,
      examples: helpResult.help.examples || [],
      aliases: helpResult.help.aliases || [],
    };
  }

  // メタデータが見つからなければ null を返す
  return null;
}

/**
 * コマンド構造とAST解析結果を結合
 */
export async function combineCommandData(
  structures: CommandStructure[],
  astResults: Map<string, ParsedASTResult>
): Promise<ParsedCommand[]> {
  const commands: ParsedCommand[] = [];

  for (const structure of structures) {
    const astResult = astResults.get(structure.commandFilePath);

    if (!astResult) {
      console.warn(`No AST result found for ${structure.commandFilePath}`);
      continue;
    }

    if (astResult.errors.length > 0) {
      console.warn(`Errors in ${structure.commandFilePath}:`, astResult.errors);
      continue;
    }

    // 1行でメタデータの読み込みを試行し、結果を const で受け取る
    const helpMetadata = await loadHelpMetadata(structure.helpFilePath);

    // 三項演算子を使って、メタデータがあればマージする
    const definitionWithMetadata = helpMetadata
      ? { ...astResult.definition, metadata: helpMetadata }
      : astResult.definition;

    commands.push({
      path: structure.path,
      segments: structure.segments,
      dynamicParams: structure.dynamicParams,
      filePath: structure.commandFilePath,
      definition: definitionWithMetadata,
    });
  }

  return commands;
}
