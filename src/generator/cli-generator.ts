import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ParsedASTResult, ParsedEnvResult } from '../parser/ast-parser.js';
import { parseEnvFile, parseHelpFile } from '../parser/ast-parser.js';
import { getVersionInfo } from '../parser/version-parser.js';
import type {
  AppStructure,
  CommandStructure,
} from '../scanner/directory-scanner.js';
import type { ParsedCommand } from '../types/command.js';
import { generateMainCLITemplate } from './main-template.js';
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
  commands: ParsedCommand[],
  envResult?: ParsedEnvResult
): Promise<GeneratedFiles> {
  const files: string[] = [];

  // app/version.tsからバージョン情報を取得
  const versionInfo = await getVersionInfo(config.appDir, config.version);

  // validation.jsをコピー
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const distDir = dirname(dirname(__dirname));

  const validationSource = join(distDir, 'dist', 'utils', 'validation.js');
  const validationDest = join(config.outputDir, 'validation.js');
  try {
    // ファイルを読み込み、importパスを修正
    let content = await readFile(validationSource, 'utf-8');
    content = content.replace(
      "import { isBoolean, isFunction, isString } from '../internal/guards/index.js';",
      "import { isBoolean, isFunction, isString } from './internal/guards/index.js';"
    );
    await writeFile(validationDest, content, 'utf-8');
    files.push(validationDest);
  } catch (error) {
    console.warn('Warning: Could not copy validation.js:', error);
  }

  // internal/guardsディレクトリをコピー
  const guardsSourceDir = join(distDir, 'dist', 'internal', 'guards');
  const guardsDestDir = join(config.outputDir, 'internal', 'guards');
  try {
    // ディレクトリを作成
    await mkdir(join(config.outputDir, 'internal'), { recursive: true });
    await mkdir(guardsDestDir, { recursive: true });

    // guards内のファイルをコピー
    const guardFiles = ['index.js', 'ast.js', 'string.js', 'validation.js'];
    for (const file of guardFiles) {
      const source = join(guardsSourceDir, file);
      const dest = join(guardsDestDir, file);
      await copyFile(source, dest);
      files.push(dest);
    }
  } catch (error) {
    console.warn('Warning: Could not copy internal/guards directory:', error);
  }

  // メインCLIファイルを生成
  const mainCLICode = generateMainCLITemplate(
    config,
    commands,
    versionInfo,
    envResult
  );
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
    const metadata: Record<string, unknown> = {
      name: helpResult.help.name,
      description: helpResult.help.description,
      examples: helpResult.help.examples || [],
      aliases: helpResult.help.aliases || [],
    };

    if (helpResult.help.additionalHelp) {
      metadata.additionalHelp = helpResult.help.additionalHelp;
    }

    return metadata;
  }

  // メタデータが見つからなければ null を返す
  return null;
}

/**
 * アプリケーション構造とAST解析結果を結合
 */
export async function combineAppData(
  appStructure: AppStructure,
  astResults: Map<string, ParsedASTResult>
): Promise<{ commands: ParsedCommand[]; envResult?: ParsedEnvResult }> {
  const commands = await combineCommandData(appStructure.commands, astResults);

  let envResult: ParsedEnvResult | undefined;
  if (appStructure.envFilePath) {
    envResult = await parseEnvFile(appStructure.envFilePath);
    if (envResult.errors.length > 0) {
      console.warn(`Errors in ${appStructure.envFilePath}:`, envResult.errors);
    }
    if (envResult.warnings.length > 0) {
      console.warn(
        `Warnings in ${appStructure.envFilePath}:`,
        envResult.warnings
      );
    }
  }

  return envResult ? { commands, envResult } : { commands };
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
