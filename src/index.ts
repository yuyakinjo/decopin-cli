import { mkdir } from 'node:fs/promises';
import {
  combineCommandData,
  type GeneratorConfig,
  generateCLI,
} from './generator/cli-generator.js';
import { parseMultipleCommandFiles } from './parser/ast-parser.js';
import { scanAppDirectory } from './scanner/directory-scanner.js';

/**
 * ビルド設定
 */
export interface BuildConfig {
  /** appディレクトリのパス */
  appDir: string;
  /** 出力ディレクトリ */
  outputDir: string;
  /** CLI名 */
  cliName: string;
  /** 出力ファイル名（デフォルト: 'cli.js'） */
  outputFileName?: string;
  /** バージョン */
  version?: string;
  /** 説明 */
  description?: string;
  /** 詳細ログを出力するか */
  verbose?: boolean;
}

/**
 * ビルド結果
 */
export interface BuildResult {
  /** 成功かどうか */
  success: boolean;
  /** 生成されたファイル一覧 */
  files: string[];
  /** エラーメッセージ */
  errors: string[];
  /** 警告メッセージ */
  warnings: string[];
  /** 統計情報 */
  stats: {
    /** 発見されたコマンド数 */
    commandCount: number;
    /** 処理時間（ミリ秒） */
    buildTime: number;
  };
}

/**
 * CLIをビルド
 */
export async function buildCLI(config: BuildConfig): Promise<BuildResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let files: string[] = [];

  try {
    if (config.verbose) {
      console.log(`🔍 Scanning app directory: ${config.appDir}`);
    }

    // 1. ディレクトリをスキャン
    const structures = await scanAppDirectory(config.appDir);

    if (config.verbose) {
      console.log(`📁 Found ${structures.length} command files`);
    }

    if (structures.length === 0) {
      warnings.push('No command files found in app directory');
      return {
        success: true,
        files: [],
        errors,
        warnings,
        stats: {
          commandCount: 0,
          buildTime: Date.now() - startTime,
        },
      };
    }

    // 2. AST解析
    if (config.verbose) {
      console.log('🔧 Parsing command files...');
    }

    const filePaths = structures.map((s) => s.commandFilePath);
    const astResults = await parseMultipleCommandFiles(filePaths);

    // エラーと警告を収集
    for (const [filePath, result] of astResults) {
      if (result.errors.length > 0) {
        errors.push(`Errors in ${filePath}: ${result.errors.join(', ')}`);
      }
      if (result.warnings.length > 0) {
        warnings.push(`Warnings in ${filePath}: ${result.warnings.join(', ')}`);
      }
    }

    // 3. コマンドデータを結合
    const commands = await combineCommandData(structures, astResults);

    if (config.verbose) {
      console.log(`✅ Successfully parsed ${commands.length} commands`);
    }

    // 4. 出力ディレクトリを作成
    await mkdir(config.outputDir, { recursive: true });

    // 5. CLI生成
    if (config.verbose) {
      console.log('🚀 Generating CLI...');
    }

    const generatorConfig: GeneratorConfig = {
      outputDir: config.outputDir,
      cliName: config.cliName,
      appDir: config.appDir,
      ...(config.outputFileName && { outputFileName: config.outputFileName }),
      ...(config.version && { version: config.version }),
      ...(config.description && { description: config.description }),
    };

    const generated = await generateCLI(generatorConfig, commands);
    files = generated.files;

    if (config.verbose) {
      console.log(`📦 Generated files:`);
      for (const file of files) {
        console.log(`  - ${file}`);
      }
    }

    const buildTime = Date.now() - startTime;

    return {
      success: true,
      files,
      errors,
      warnings,
      stats: {
        commandCount: commands.length,
        buildTime,
      },
    };
  } catch (error) {
    errors.push(`Build failed: ${error}`);
    return {
      success: false,
      files,
      errors,
      warnings,
      stats: {
        commandCount: 0,
        buildTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * デフォルト設定でビルド
 */
export async function buildWithDefaults(
  appDir: string = './app',
  outputDir: string = './dist',
  cliName: string = 'cli'
): Promise<BuildResult> {
  return buildCLI({
    appDir,
    outputDir,
    cliName,
    verbose: true,
  });
}

/**
 * 利用可能なコマンド一覧を取得
 */
export async function listCommands(
  appDir: string = './app'
): Promise<string[]> {
  try {
    const structures = await scanAppDirectory(appDir);
    return structures.map((s) => s.path.replace(/\//g, ' '));
  } catch (error) {
    console.error(`Failed to list commands: ${error}`);
    return [];
  }
}

/**
 * CLIビルダーの情報
 */
export const builderInfo = {
  name: 'decopin-cli',
  version: '0.1.0',
  description:
    'Next.js App Router風のファイルベースCLIビルダー（関数形式export対応）',
};

export type {
  GeneratedFiles,
  GeneratorConfig,
} from './generator/cli-generator.js';
export type { ParsedASTResult } from './parser/ast-parser.js';
export type {
  CommandStructure,
  DirectoryEntry,
} from './scanner/directory-scanner.js';
// 主要な型をエクスポート
export type {
  CommandContext,
  CommandDefinition,
  CommandHandler,
} from './types/command.js';
