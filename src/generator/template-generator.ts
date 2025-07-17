import type { VersionInfo } from '../parser/version-parser.js';
import type { ParsedCommand } from '../types/command.js';
import type { GeneratorConfig } from './cli-generator.js';

/**
 * メインCLIテンプレートを生成
 */
export function generateMainCLITemplate(
  config: GeneratorConfig,
  commands: ParsedCommand[],
  versionInfo?: VersionInfo
): string {
  // コマンドルートの生成
  const commandRoutes = commands
    .map((cmd) => {
      const routeKey = cmd.path || 'root';
      const relativePath = generateRelativePath(config.appDir, cmd.filePath);
      const importPath = `./${relativePath}`;
      const paramsPath = generateParamsPath(config.appDir, cmd.filePath);

      return `  '${routeKey}': async () => {
    const commandModule = await import('${importPath}');
    const commandFactory = commandModule.default;

    // params.tsが存在する場合、バリデーション機能付きのファクトリとして扱う
    try {
      const paramsModule = await import('${paramsPath}');
      const createParams = paramsModule.default;
      const paramsDefinition = typeof createParams === 'function' ? createParams() : createParams;

      return {
        isFactory: true,
        factory: commandFactory,
        paramsDefinition: paramsDefinition
      };
    } catch {
      return typeof commandFactory === 'function' ? commandFactory() : commandFactory;
    }
  }`;
    })
    .join(',\n');

  return generateCLIScript(config, commands, commandRoutes, versionInfo);
}

/**
 * 相対パス生成
 */
function generateRelativePath(appDir: string, filePath: string): string {
  const { resolve, relative } = require('node:path');
  const absoluteAppDir = resolve(appDir);
  return relative(absoluteAppDir, filePath).replace('.ts', '.js');
}

/**
 * params.tsパス生成
 */
function generateParamsPath(appDir: string, filePath: string): string {
  const { resolve, relative } = require('node:path');
  const absoluteAppDir = resolve(appDir);
  const dirPath = relative(absoluteAppDir, filePath.replace('/command.ts', ''));
  return `./${dirPath}/params.js`;
}

/**
 * CLIスクリプト本体を生成
 */
function generateCLIScript(
  config: GeneratorConfig,
  commands: ParsedCommand[],
  commandRoutes: string,
  versionInfo?: VersionInfo
): string {
  const cliName = config.cliName;
  const version = versionInfo?.version || config.version || '1.0.0';
  const description =
    versionInfo?.metadata?.description ||
    config.description ||
    'File-based CLI built with decopin-cli';
  const cliDisplayName = versionInfo?.metadata?.name || cliName;

  return `#!/usr/bin/env node

// Generated CLI for ${cliDisplayName}
// Built with decopin-cli

const commandRoutes = {
${commandRoutes}
};

const validateRoutes = {};
const errorRoutes = {};

${generateValidationFunction()}

${generateArgumentParser()}

${generateCommandMatcher(commands)}

${generateHelpFunctions(cliName, cliDisplayName, description, version, versionInfo, commands)}

${generateMainFunction(cliName, cliDisplayName, description, version, versionInfo)}

// 実行
main().catch(console.error);
`;
}

/**
 * バリデーション関数生成
 */
function generateValidationFunction(): string {
  return `function createValidationFunction(paramsDefinition) {
  const { extractData } = require('./validation.js');

  return async (args, options, params) => {
    try {
      const data = extractData(args, options, params, paramsDefinition);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          issues: error.issues || []
        }
      };
    }
  };
}`;
}

/**
 * 引数パーサー生成
 */
function generateArgumentParser(): string {
  return `function parseArguments(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=', 2);
      if (value !== undefined) {
        options[key] = value;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      options[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}`;
}

/**
 * コマンドマッチャー生成
 */
function generateCommandMatcher(commands: ParsedCommand[]): string {
  return `function matchCommand(segments) {
  const availableCommands = [
${commands
  .map((cmd) => {
    const path = cmd.path || '';
    const segments = path ? path.split('/') : [];
    return `    { path: '${path}', segments: ${JSON.stringify(segments)}, definition: {} }`;
  })
  .join(',\n')}
  ];

  for (const command of availableCommands) {
    if (segments.length >= command.segments.length) {
      let match = true;
      const params = {};

      for (let i = 0; i < command.segments.length; i++) {
        const segment = command.segments[i];
        const userSegment = segments[i];

        if (segment.startsWith('[') && segment.endsWith(']')) {
          const paramName = segment.slice(1, -1);
          params[paramName] = userSegment;
        } else if (segment !== userSegment) {
          match = false;
          break;
        }
      }

      if (match) {
        return { command, params };
      }
    }
  }

  return { command: null, params: {} };
}`;
}

/**
 * ヘルプ関数群生成
 */
function generateHelpFunctions(
  cliName: string,
  cliDisplayName: string,
  description: string,
  version: string,
  versionInfo?: VersionInfo,
  commands: ParsedCommand[] = []
): string {
  const commandList = commands
    .map((cmd) => `  ${cmd.path || 'root'}`)
    .join('\n');

  return `function showHelp() {
  console.log(\`${cliDisplayName} ${version}\`);
  console.log(\`${description}\`);
  console.log();
  console.log('Usage:');
  console.log(\`  ${cliName} <command> [options]\`);
  console.log();
  console.log('Available commands:');
${commandList ? `  console.log(\`${commandList}\`);` : '  console.log("  No commands available");'}
  console.log();
  console.log('Options:');
  console.log('  --help, -h     Show help');
  console.log('  --version, -v  Show version');
${
  versionInfo?.metadata?.author
    ? `
  console.log();
  console.log('Author: ${versionInfo.metadata.author}');`
    : ''
}
}

function showCommandHelp(command) {
  console.log(\`Usage: ${cliName} \${command.path}\`);
  if (command.definition.metadata?.description) {
    console.log(command.definition.metadata.description);
  }
}`;
}

/**
 * メイン関数生成
 */
function generateMainFunction(
  _cliName: string,
  _cliDisplayName: string,
  _description: string,
  version: string,
  versionInfo?: VersionInfo
): string {
  return `async function main() {
  const args = process.argv.slice(2);
  const { options, positional } = parseArguments(args);

  // ヘルプオプション
  if (options.help || options.h || positional.length === 0) {
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
        showHelp: () => showCommandHelp(command)
      };

      // バリデーションを実行
      const validationResult = await validateFunction(initialContext.args, initialContext.options, initialContext.params);

      if (!validationResult.success) {
        console.error('❌ Validation failed:', validationResult.error.message);
        if (validationResult.error.issues) {
          for (const issue of validationResult.error.issues) {
            const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
            console.error(\`  • \${field}: \${issue.message}\`);
          }
        }
        process.exit(1);
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

    // コンテキストを作成
    const context = {
      args: positional.slice(command.segments.length),
      options,
      params,
      showHelp: () => showCommandHelp(command),
      ...(commandResult.isFactory && { validatedData: context.validatedData })
    };

    // コマンドを実行
    await commandDefinition.handler(context);
  } catch (error) {
    console.error(\`❌ Command failed: \${error.message}\`);
    process.exit(1);
  }
}`;
}
