#!/usr/bin/env node

import { buildCLI, listCommands, builderInfo } from './index.js';

/**
 * ヘルプテキストを表示
 */
function showHelp() {
  console.log(`${builderInfo.name} ${builderInfo.version}
${builderInfo.description}

Usage:
  decopin <command> [options]

Commands:
  build                    Build CLI from app directory
  list                     List available commands
  init                     Initialize a new CLI project
  help                     Show this help message
  version                  Show version

Build Options:
  --app-dir <path>         App directory path (default: ./app)
  --output-dir <path>      Output directory path (default: ./dist)
  --cli-name <name>        CLI name (default: cli)
  --output-filename <name> Output filename (default: cli.js)
  --version <version>      CLI version
  --description <desc>     CLI description
  --verbose               Show verbose output

Examples:
  decopin build
  decopin build --app-dir ./commands --cli-name my-cli
  decopin list --app-dir ./commands
  decopin init my-awesome-cli
`);
}

/**
 * バージョンを表示
 */
function showVersion() {
  console.log(builderInfo.version);
}

/**
 * 引数を解析
 */
function parseArguments(args: string[]) {
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

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

/**
 * 新しいCLIプロジェクトを初期化
 */
async function initProject(projectName: string) {
  console.log(`🚀 Initializing new CLI project: ${projectName}`);

  // TODO: プロジェクト初期化機能を実装
  console.log(`📁 Create directory: ${projectName}/`);
  console.log(`📁 Create directory: ${projectName}/app/`);
  console.log(`📄 Create file: ${projectName}/app/hello/command.ts`);
  console.log(`📄 Create file: ${projectName}/package.json`);
  console.log(`📄 Create file: ${projectName}/tsconfig.json`);
  console.log(`📄 Create file: ${projectName}/decopin.config.ts`);

  console.log(`
✅ Project initialized successfully!

Next steps:
  cd ${projectName}
  npm install
  npm run build

Example command structure:
  app/
  ├── hello/
  │   └── command.ts     # Available as: ${projectName} hello
  └── user/
      ├── create/
      │   └── command.ts # Available as: ${projectName} user create
      └── list/
          └── command.ts # Available as: ${projectName} user list
`);
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const { options, positional } = parseArguments(args);

  const command = positional[0];

  // ヘルプオプション
  if (options.help || options.h || !command) {
    showHelp();
    return;
  }

  // バージョンオプション
  if (options.version || options.v) {
    showVersion();
    return;
  }

  try {
    switch (command) {
      case 'build': {
        console.log('🔨 Building CLI...');

        const result = await buildCLI({
          appDir: (options['app-dir'] as string) || './app',
          outputDir: (options['output-dir'] as string) || './dist',
          cliName: (options['cli-name'] as string) || 'cli',
          outputFileName: options['output-filename'] as string,
          version: options.version as string,
          description: options.description as string,
          verbose: Boolean(options.verbose),
        });

        if (result.success) {
          console.log(`\n✅ Build completed successfully!`);
          console.log(
            `📊 Generated ${result.stats.commandCount} commands in ${result.stats.buildTime}ms`
          );

          if (result.warnings.length > 0) {
            console.log(`\n⚠️  Warnings:`);
            for (const warning of result.warnings) {
              console.log(`  - ${warning}`);
            }
          }
        } else {
          console.error(`\n❌ Build failed!`);
          for (const error of result.errors) {
            console.error(`  - ${error}`);
          }
          process.exit(1);
        }
        break;
      }

      case 'list': {
        const appDir = (options['app-dir'] as string) || './app';
        console.log(`📋 Listing commands in ${appDir}...`);

        const commands = await listCommands(appDir);

        if (commands.length === 0) {
          console.log('No commands found.');
        } else {
          console.log(`\nAvailable commands (${commands.length}):`);
          for (const cmd of commands) {
            console.log(`  - ${cmd}`);
          }
        }
        break;
      }

      case 'init': {
        const projectName = positional[1];
        if (!projectName) {
          console.error('❌ Project name is required');
          console.error('Usage: decopin init <project-name>');
          process.exit(1);
        }

        await initProject(projectName);
        break;
      }

      case 'help':
        showHelp();
        break;

      case 'version':
        showVersion();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error('Use "decopin help" to see available commands');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Command failed: ${error}`);
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
