import { writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { ParsedASTResult } from '../parser/ast-parser.js';
import { parseHelpFile } from '../parser/ast-parser.js';
import { getVersionInfo, type VersionInfo } from '../parser/version-parser.js';
import type { CommandStructure } from '../scanner/directory-scanner.js';
import type { ParsedCommand } from '../types/command.js';

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

  // コマンドルートの生成（params.tsがある場合はバリデーション統合）
  const commandRoutes = commands
    .map((cmd) => {
      const routeKey = cmd.path || 'root';
      // appディレクトリを基準とした相対パスを生成
      const absoluteAppDir = resolve(config.appDir);
      const relativePath = relative(absoluteAppDir, cmd.filePath).replace(
        '.ts',
        '.js'
      );
      const importPath = `./${relativePath}`;

      // params.tsが存在するかチェック
      const dirPath = relative(
        absoluteAppDir,
        cmd.filePath.replace('/command.ts', '')
      );
      const paramsPath = `./${dirPath}/params.js`;

      return `  '${routeKey}': async () => {
    const commandModule = await import('${importPath}');
    const commandFactory = commandModule.default;

    // params.tsが存在する場合、バリデーション機能付きのファクトリとして扱う
    try {
      const paramsModule = await import('${paramsPath}');
      const createParams = paramsModule.default;
      const paramsDefinition = typeof createParams === 'function' ? createParams() : createParams;

      // バリデーション機能付きファクトリ関数を返す
      return {
        isFactory: true,
        factory: commandFactory,
        paramsDefinition: paramsDefinition
      };
    } catch {
      // params.tsが存在しない場合、通常のcommand定義として扱う
      return typeof commandFactory === 'function' ? commandFactory() : commandFactory;
    }
  }`;
    })
    .join(',\n');

  // バリデーションルートの生成
  const validateRoutes = commands
    .map((cmd) => {
      const routeKey = cmd.path || 'root';
      const absoluteAppDir = resolve(config.appDir);
      const dirPath = relative(
        absoluteAppDir,
        cmd.filePath.replace('/command.ts', '')
      );
      const validatePath = `./${dirPath}/validate.js`;
      return `  '${routeKey}': () => import('${validatePath}').then(m => m.default).catch(() => null)`;
    })
    .join(',\n');

  // エラーハンドラールートの生成
  const errorRoutes = commands
    .map((cmd) => {
      const routeKey = cmd.path || 'root';
      const absoluteAppDir = resolve(config.appDir);
      const dirPath = relative(
        absoluteAppDir,
        cmd.filePath.replace('/command.ts', '')
      );
      const errorPath = `./${dirPath}/error.js`;
      return `  '${routeKey}': () => import('${errorPath}').then(m => m.default).catch(() => null)`;
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

// バリデーション関数を作成するヘルパー（シンプル版）
function createValidationFunction(paramsDefinition) {
  return async (args, options, params) => {
    try {
      const data = {};

      // マッピング定義に基づいてデータを収集
      for (const mapping of paramsDefinition.mappings) {
        let value = mapping.defaultValue;

        // オプション値をチェック
        if (mapping.option && options[mapping.option] !== undefined) {
          value = options[mapping.option];
        }
        // 位置引数をチェック
        else if (mapping.argIndex !== undefined && args[mapping.argIndex] !== undefined) {
          value = args[mapping.argIndex];
        }

        data[mapping.field] = value;
      }

      // 基本的なバリデーション（必須フィールドチェックなど）
      const issues = [];

      for (const mapping of paramsDefinition.mappings) {
        const value = data[mapping.field];

        // 基本的な型チェック
        if (value === undefined || value === null || value === '') {
          // デフォルト値があれば使用
          if (mapping.defaultValue !== undefined) {
            data[mapping.field] = mapping.defaultValue;
          } else {
            issues.push({
              path: [mapping.field],
              message: \`\${mapping.field} is required\`
            });
          }
        }
      }

      if (issues.length > 0) {
        return {
          success: false,
          error: {
            message: 'Validation failed',
            issues: issues
          }
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message || 'Validation error'
        }
      };
    }
  };
}const validateRoutes = {
${validateRoutes}
};

const errorRoutes = {
${errorRoutes}
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
  if (segments.length >= ${cmd.segments.length} && ${cmd.segments.map((s, i) => `segments[${i}] === '${s}'`).join(' && ')}) {
    return { command: ${JSON.stringify(cmd)}, params };
  }`
    )
    .join('')}

  // 動的コマンドをチェック
  ${commands
    .filter((cmd) => cmd.dynamicParams.length > 0)
    .map(
      (cmd) => `
  if (segments.length >= ${cmd.segments.length}) {
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

function showCommandHelp(command) {
  const cmdPath = (command.path || 'root').replace(/\\//g, ' ');
  const metadata = command.definition.metadata || {};

  console.log(\`${cliDisplayName} ${version}\`);
  console.log(\`Command: \${cmdPath}\`);
  console.log();

  if (metadata.description) {
    console.log(\`Description:\`);
    console.log(\`  \${metadata.description}\`);
    console.log();
  }

  console.log(\`Usage:\`);
  console.log(\`  ${cliName} \${cmdPath} [options]\`);
  console.log();

  if (metadata.examples && metadata.examples.length > 0) {
    console.log(\`Examples:\`);
    for (const example of metadata.examples) {
      console.log(\`  \${example}\`);
    }
    console.log();
  }

  if (metadata.aliases && metadata.aliases.length > 0) {
    console.log(\`Aliases:\`);
    console.log(\`  \${metadata.aliases.join(', ')}\`);
    console.log();
  }

  if (metadata.additionalHelp) {
    console.log(\`Additional Information:\`);
    console.log(\`  \${metadata.additionalHelp}\`);
    console.log();
  }

  console.log(\`Options:\`);
  console.log(\`  --help, -h    Show this help message\`);
}

async function main() {
  const args = process.argv.slice(2);
  const { options, positional } = parseArguments(args);

  // ヘルプオプション
  if (options.help || options.h) {
    // 特定のコマンドのヘルプが要求された場合
    if (positional.length > 0) {
      const { command } = matchCommand(positional);
      if (command) {
        showCommandHelp(command);
        return;
      }
    }
    // 全体のヘルプを表示
    showHelp();
    return;
  }

  // 引数なしの場合は全体のヘルプを表示
  if (args.length === 0) {
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
    // コマンドを動的にインポートして取得
    const commandResult = await commandRoutes[command.path]();
    let commandDefinition;
    let validateFunction = null;
    let errorHandler = null;

    // 新しいファクトリ形式かチェック
    if (commandResult.isFactory) {
      // バリデーション機能付きのファクトリ関数形式
      const { factory, paramsDefinition } = commandResult;

      // バリデーション関数を作成
      validateFunction = createValidationFunction(paramsDefinition);

      // コンテキストを事前作成してバリデーション実行
      const initialContext = {
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

      // バリデーションを実行
      const validationResult = await validateFunction(initialContext.args, initialContext.options, initialContext.params);

      if (!validationResult.success) {
        // エラーハンドラーがあれば使用
        try {
          const errorModulePath = command.path.split('/').join('/');
          const errorModule = await import(\`./\${errorModulePath}/error.js\`);
          errorHandler = typeof errorModule.default === 'function' && errorModule.default.length === 0
            ? errorModule.default()
            : errorModule.default;
          await errorHandler(validationResult.error);
        } catch {
          // デフォルトエラー処理
          console.error('❌ Validation failed:', validationResult.error.message);
          if (validationResult.error.issues) {
            for (const issue of validationResult.error.issues) {
              const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
              console.error(\`  • \${field}: \${issue.message}\`);
            }
          }
          process.exit(1);
        }
        return;
      }

      // バリデーション成功時、バリデーション済みデータを含むコンテキストでファクトリを呼び出し
      initialContext.validatedData = validationResult.data;
      commandDefinition = factory(initialContext);
    } else {
      // 従来の形式
      commandDefinition = commandResult;
      if (typeof commandDefinition === 'function') {
        commandDefinition = commandDefinition();
      }
    }

    // 従来のバリデーション処理（ファクトリ形式でない場合）
    if (!commandResult.isFactory) {
      const validateModule = validateRoutes[command.path] ? await validateRoutes[command.path]() : null;
      validateFunction = validateModule;

      if (typeof validateFunction === 'function' && validateFunction.length === 0) {
        validateFunction = validateFunction();
      }

      const errorModule = errorRoutes[command.path] ? await errorRoutes[command.path]() : null;
      errorHandler = errorModule;

      if (typeof errorHandler === 'function' && errorHandler.length === 0) {
        errorHandler = errorHandler();
      }
    }

    // コンテキストを作成（ファクトリ形式でない場合のみ）
    if (!commandResult.isFactory) {
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

      // バリデーションを実行
      if (validateFunction) {
        const validationResult = await validateFunction(context.args, context.options, context.params);

        if (!validationResult.success) {
          if (errorHandler) {
            await errorHandler(validationResult.error);
          } else {
            console.error('❌ Validation failed:', validationResult.error.message);
            if (validationResult.error.issues) {
              for (const issue of validationResult.error.issues) {
                const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
                console.error(\`  • \${field}: \${issue.message}\`);
              }
            }
            process.exit(1);
          }
          return;
        }

        context.validatedData = validationResult.data;
      }

      // ミドルウェアを実行
      if (commandDefinition.middleware) {
        for (const middleware of commandDefinition.middleware) {
          await middleware(context, () => Promise.resolve());
        }
      }

      // ハンドラーを実行
      await commandDefinition.handler(context);
    } else {
      // ファクトリ形式の場合、すでにバリデーション済みなのでハンドラーを直接実行
      await commandDefinition.handler();
    }

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

    // help.tsファイルがある場合はメタデータを読み込む
    let helpMetadata = null;
    if (structure.helpFilePath) {
      const helpResult = await parseHelpFile(structure.helpFilePath);
      if (helpResult.help) {
        helpMetadata = {
          name: helpResult.help.name,
          description: helpResult.help.description,
          examples: helpResult.help.examples || [],
          aliases: helpResult.help.aliases || [],
        };
      } else if (helpResult.errors.length > 0) {
        console.warn(`Errors in ${structure.helpFilePath}:`, helpResult.errors);
      }
    }

    // help.tsのメタデータがある場合は優先して使用
    const definition = { ...astResult.definition };
    if (helpMetadata) {
      definition.metadata = helpMetadata;
    }

    commands.push({
      path: structure.path,
      segments: structure.segments,
      dynamicParams: structure.dynamicParams,
      filePath: structure.commandFilePath,
      definition: definition,
    });
  }

  return commands;
}
