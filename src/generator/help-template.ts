import type { VersionInfo } from '../parser/version-parser.js';
import type { ParsedCommand } from '../types/command.js';

/**
 * ヘルプ関数群生成
 */
export function generateHelpFunctions(
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
  const metadata = command.definition.metadata;

  console.log(\`Usage: ${cliName} \${command.path}\`);

  if (metadata?.description) {
    console.log();
    console.log(metadata.description);
  }

  if (metadata?.examples && metadata.examples.length > 0) {
    console.log();
    console.log('Examples:');
    for (const example of metadata.examples) {
      console.log(\`  ${cliName} \${example}\`);
    }
  }

  if (metadata?.aliases && metadata.aliases.length > 0) {
    console.log();
    console.log(\`Aliases: \${metadata.aliases.join(', ')}\`);
  }

  if (metadata?.additionalHelp) {
    console.log();
    console.log(metadata.additionalHelp);
  }
}`;
}

/**
 * メイン関数生成
 */
export function generateMainFunction(
  _cliName: string,
  _cliDisplayName: string,
  _description: string,
  version: string,
  versionInfo?: VersionInfo
): string {
  return `async function main() {
  const args = process.argv.slice(2);
  const { options, positional } = parseArguments(args);

  // 引数がない場合は全般的なヘルプを表示
  if (positional.length === 0) {
    showHelp();
    return;
  }

  // ヘルプオプションがある場合
  if (options.help || options.h) {
    // コマンドが指定されている場合はそのコマンドのヘルプを表示
    const { command } = matchCommand(positional);
    if (command) {
      showCommandHelp(command);
      return;
    } else {
      // 不明なコマンドの場合は全般的なヘルプを表示
      showHelp();
      return;
    }
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
    let validatedData = null;

    // 新しいファクトリ形式かチェック
    if (commandResult.isFactory) {
      // バリデーション機能付きのファクトリ関数形式
      const { factory, paramsDefinition, errorHandler } = commandResult;

      // バリデーション関数を作成
      validateFunction = await createValidationFunction(paramsDefinition);

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
        // カスタムエラーハンドラーがある場合はそれを使用
        if (errorHandler && typeof errorHandler === 'function') {
          const customErrorHandler = errorHandler();
          if (customErrorHandler && typeof customErrorHandler === 'function') {
            await customErrorHandler(validationResult.error);
            return;
          }
        }

        // デフォルトのエラーハンドリング
        console.error('❌ Validation failed:', validationResult.error.message);
        if (validationResult.error.issues) {
          for (const issue of validationResult.error.issues) {
            const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
            console.error(\`  • \${field}: \${issue.message}\`);
          }
        }
        process.exit(1);
      }

      // バリデーション成功時、バリデーション済みデータを保存
      validatedData = validationResult.data;
      initialContext.validatedData = validatedData;
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
      ...(commandResult.isFactory && { validatedData })
    };

    // コマンドを実行
    await commandDefinition.handler(context);
  } catch (error) {
    console.error(\`❌ Command failed: \${error.message}\`);
    process.exit(1);
  }
}`;
}
