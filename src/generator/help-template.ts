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

async function showCommandHelp(command) {
  const metadata = command.definition.metadata;

  console.log(\`Usage: ${cliName} \${command.path}\`);

  if (metadata?.description) {
    console.log();
    console.log(metadata.description);
  }

  // params.tsから引数情報を取得
  await showParamsInfo(command);

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
}

async function showParamsInfo(command) {
  try {
    // params.tsを動的にインポートして引数情報を表示
    const paramsPath = \`./app/\${command.path}/params.js\`;
    const paramsModule = await import(paramsPath);
    const createParams = paramsModule.default;
    const paramsDefinition = typeof createParams === 'function' ? createParams() : createParams;

    if (paramsDefinition && paramsDefinition.mappings && paramsDefinition.mappings.length > 0) {
      console.log();
      console.log('Arguments:');

      // 位置引数
      const positionalArgs = paramsDefinition.mappings
        .filter(m => typeof m.argIndex === 'number')
        .sort((a, b) => a.argIndex - b.argIndex);

      if (positionalArgs.length > 0) {
        for (const mapping of positionalArgs) {
          const optionText = mapping.option ? \` (or --\${mapping.option})\` : '';
          console.log(\`  [\${mapping.argIndex + 1}] \${mapping.field}\${optionText}\`);
        }
      }

      // オプション引数（位置引数でないもの）
      const optionArgs = paramsDefinition.mappings.filter(m => typeof m.argIndex !== 'number');
      if (optionArgs.length > 0) {
        console.log();
        console.log('Options:');
        for (const mapping of optionArgs) {
          console.log(\`  --\${mapping.option}  \${mapping.field}\`);
        }
      }
    }
  } catch (error) {
    // params.tsがない場合やエラーが発生した場合は何もしない
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

  // バージョンオプション（優先的に処理）
  if (options.version || options.v) {
    console.log('${version}');${
      versionInfo?.metadata?.author
        ? `
    console.log('Author: ${versionInfo.metadata.author}');`
        : ''
    }
    return;
  }

  // ヘルプオプションがある場合
  if (options.help || options.h) {
    // コマンドが指定されている場合はそのコマンドのヘルプを表示
    const { command } = matchCommand(positional);
    if (command) {
      await showCommandHelp(command);
      return;
    } else {
      // 不明なコマンドの場合は全般的なヘルプを表示
      showHelp();
      return;
    }
  }

  // 引数がない場合は全般的なヘルプを表示
  if (positional.length === 0) {
    showHelp();
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
        showHelp: async () => await showCommandHelp(command)
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

      // ファクトリ関数（実際のコマンドハンドラー）を実行
      await factory(initialContext);
    } else {
      // 従来の形式（params.tsなし）
      const context = {
        args: positional.slice(command.segments.length),
        options,
        params,
        showHelp: async () => await showCommandHelp(command)
      };

      if (typeof commandResult === 'function') {
        // 新しい形式：直接関数として実行
        await commandResult(context);
      } else if (commandResult && typeof commandResult.handler === 'function') {
        // 古い形式：オブジェクトのhandlerを実行（後方互換性）
        await commandResult.handler(context);
      } else {
        throw new Error('Invalid command format');
      }
    }
  } catch (error) {
    console.error(\`❌ Command failed: \${error.message}\`);
    process.exit(1);
  }
}`;
}
