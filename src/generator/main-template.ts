import type { VersionInfo } from '../parser/version-parser.js';
import type { ParsedCommand } from '../types/command.js';
import type { GeneratorConfig } from './cli-generator.js';
import {
  generateHelpFunctions,
  generateMainFunction,
} from './help-template.js';
import {
  generateArgumentParser,
  generateCommandMatcher,
  generateValidationFunction,
} from './runtime-template.js';
import {
  generateErrorPath,
  generateParamsPath,
  generateRelativePath,
} from './utils-template.js';

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
      const errorPath = generateErrorPath(config.appDir, cmd.filePath);

      return `  '${routeKey}': async () => {
    const commandModule = await import('${importPath}');
    const commandFactory = commandModule.default;

    // params.tsが存在する場合、バリデーション機能付きのファクトリとして扱う
    try {
      const paramsModule = await import('${paramsPath}');
      const createParams = paramsModule.default;
      const paramsDefinition = typeof createParams === 'function' ? createParams() : createParams;

      // error.tsが存在する場合、エラーハンドラーもインポート
      let errorHandler = null;
      try {
        const errorModule = await import('${errorPath}');
        errorHandler = errorModule.default;
      } catch {
        // error.tsがない場合はnullのまま
      }

      return {
        isFactory: true,
        factory: commandFactory,
        paramsDefinition: paramsDefinition,
        errorHandler: errorHandler
      };
    } catch {
      return commandFactory;
    }
  }`;
    })
    .join(',\n');

  return generateCLIScript(config, commands, commandRoutes, versionInfo);
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
