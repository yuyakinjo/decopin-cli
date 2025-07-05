import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandStructure } from '../scanner/directory-scanner.js';
import type { ParsedASTResult } from '../parser/ast-parser.js';
import type { ParsedCommand } from '../types/command.js';
import { getVersionInfo, type VersionInfo } from '../parser/version-parser.js';

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
 * メインCLIコードを生成
 */
function generateMainCLI(
  config: GeneratorConfig,
  commands: ParsedCommand[],
  versionInfo?: VersionInfo
): string {
  const cliName = config.cliName;
  const version = versionInfo?.version || config.version || '1.0.0';
  const description =
    versionInfo?.metadata?.description ||
    config.description ||
    'File-based CLI built with decopin-cli';
  const cliDisplayName = versionInfo?.metadata?.name || cliName;

  // コマンドルートの生成
  const commandRoutes = commands
    .map((cmd) => {
      const routeKey = cmd.path || 'root';
      const importPath = `../${cmd.filePath.replace('.ts', '.js')}`;
      return `  '${routeKey}': () => import('${importPath}').then(m => m.default)`;
    })
    .join(',\n');

  // ヘルプテキストの生成
  const helpCommands = commands
    .map((cmd) => {
      const cmdPath = (cmd.path || 'root').replace(/\//g, ' ');
      const desc = cmd.definition.metadata?.description || 'No description';
      return `  console.log('  ${cmdPath.padEnd(20)} ${desc}');`;
    })
    .join('\n');

  return `#!/usr/bin/env node

const commandRoutes = {
${commandRoutes}
};

function parseArguments(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

            if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function matchCommand(segments) {
  const params = {};

  // 静的コマンドをチェック
  ${commands
    .filter((cmd) => cmd.dynamicParams.length === 0)
    .map(
      (cmd) => `
  if (segments.length === ${cmd.segments.length} && ${cmd.segments.map((s, i) => `segments[${i}] === '${s}'`).join(' && ')}) {
    return { command: ${JSON.stringify(cmd)}, params };
  }`
    )
    .join('')}

  // 動的コマンドをチェック
  ${commands
    .filter((cmd) => cmd.dynamicParams.length > 0)
    .map(
      (cmd) => `
  if (segments.length === ${cmd.segments.length}) {
    let match = true;
    const tempParams = {};
    ${cmd.segments
      .map((segment, index) => {
        if (segment.startsWith('[') && segment.endsWith(']')) {
          const paramName = segment.slice(1, -1);
          return `    tempParams['${paramName}'] = segments[${index}];`;
        } else {
          return `    if (segments[${index}] !== '${segment}') match = false;`;
        }
      })
      .join('\n')}

    if (match) {
      Object.assign(params, tempParams);
      return { command: ${JSON.stringify(cmd)}, params };
    }
  }`
    )
    .join('')}

  return { command: null, params };
}

function showHelp() {
  console.log(\`${cliDisplayName} ${version}
${description}

Usage:
  ${cliName} <command> [options]

Available commands:\`);
${helpCommands}
  console.log(\`
Options:
  --help, -h    Show help
  --version, -v Show version\`);
}

async function main() {
  const args = process.argv.slice(2);
  const { options, positional } = parseArguments(args);

  // ヘルプオプション
  if (options.help || options.h || args.length === 0) {
    showHelp();
    return;
  }

  // バージョンオプション
  if (options.version || options.v) {
    console.log('${version}');${
      versionInfo?.metadata?.author
        ? `
    console.log('Author: ${versionInfo.metadata.author}');`
        : ''
    }
    return;
  }

  // コマンドをマッチ
  const { command, params } = matchCommand(positional);

  if (!command) {
    console.error(\`Unknown command: \${positional.join(' ')}\`);
    console.error('Use --help to see available commands');
    process.exit(1);
  }

  try {
    // コマンドを動的にインポート
    const commandModule = await commandRoutes[command.path]();
    const commandDefinition = commandModule;

    // コンテキストを作成
    const context = {
      args: positional.slice(command.segments.length),
      options,
      params,
      showHelp: () => {
        console.log(\`Usage: ${cliName} \${command.path}\`);
        if (command.definition.metadata?.description) {
          console.log(command.definition.metadata.description);
        }
      }
    };

    // ミドルウェアを実行
    if (commandDefinition.middleware) {
      for (const middleware of commandDefinition.middleware) {
        await middleware(context, () => Promise.resolve());
      }
    }

    // ハンドラーを実行
    await commandDefinition.handler(context);

  } catch (error) {
    console.error('Command execution failed:', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// メイン実行
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
`;
}

/**
 * 型定義ファイルを生成
 */
function generateTypeDefinitions(commands: ParsedCommand[]): string {
  return `// Generated type definitions for CLI commands

export interface CLIContext {
  args: string[];
  options: Record<string, any>;
  params: Record<string, string>;
  showHelp: () => void;
}

export type CLIHandler = (context: CLIContext) => Promise<void> | void;

export interface CLICommand {
  metadata?: {
    name?: string;
    description?: string;
    examples?: string[];
    aliases?: string[];
  };
  schema?: {
    args?: any;
    options?: any;
  };
  middleware?: Array<(context: CLIContext, next: () => Promise<void> | void) => Promise<void> | void>;
  handler: CLIHandler;
}

declare global {
  namespace CLI {
    interface Commands {
${commands.map((cmd) => `      '${cmd.path}': CLICommand;`).join('\n')}
    }
  }
}
`;
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
  const mainCLICode = generateMainCLI(config, commands, versionInfo);
  const mainFile = join(config.outputDir, 'cli.js');
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
 * コマンド構造とAST解析結果を結合
 */
export function combineCommandData(
  structures: CommandStructure[],
  astResults: Map<string, ParsedASTResult>
): ParsedCommand[] {
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

    commands.push({
      path: structure.path,
      segments: structure.segments,
      dynamicParams: structure.dynamicParams,
      filePath: structure.commandFilePath,
      definition: astResult.definition,
    });
  }

  return commands;
}
