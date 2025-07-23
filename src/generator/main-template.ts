import type { ParsedEnvResult } from '../parser/ast-parser.js';
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
  versionInfo?: VersionInfo,
  envResult?: ParsedEnvResult
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

  return generateCLIScript(
    config,
    commands,
    commandRoutes,
    versionInfo,
    envResult
  );
}

/**
 * CLIスクリプト本体を生成
 */
function generateCLIScript(
  config: GeneratorConfig,
  commands: ParsedCommand[],
  commandRoutes: string,
  versionInfo?: VersionInfo,
  envResult?: ParsedEnvResult
): string {
  const cliName = config.cliName;
  const version = versionInfo?.version || config.version || '1.0.0';
  const description =
    versionInfo?.metadata?.description ||
    config.description ||
    'File-based CLI built with decopin-cli';
  const cliDisplayName = versionInfo?.metadata?.name || cliName;

  // 環境変数の処理
  const envImport = envResult
    ? `
// 環境変数のインポートと初期化
let globalEnv = {};
let envInitialized = false;

async function initializeEnv(requiresEnv = false) {
  if (envInitialized) {
    return globalEnv;
  }

  try {
    const envModule = await import('./app/env.js');
    const createEnv = envModule.default;
    const { createTypeSafeEnv } = await import('./validation.js');

    const envResult = await createTypeSafeEnv(createEnv);
    if (envResult.success) {
      globalEnv = envResult.data;
    } else {
      // 環境変数の検証が失敗した場合、プロキシオブジェクトでラップ
      globalEnv = createEnvProxy(envResult.error);
    }
  } catch (error) {
    // env.tsがない場合は空のオブジェクトを使用
    globalEnv = {};
  }

  envInitialized = true;
  return globalEnv;
}

// 環境変数アクセス時にエラーを投げるプロキシ
function createEnvProxy(validationError) {
  return new Proxy({}, {
    get(target, prop) {
      // 内部プロパティ（Symbol等）やJSONシリアライゼーション時のアクセスは無視
      if (typeof prop === 'symbol' || prop === 'toJSON' || prop === 'valueOf' || prop === 'toString' || prop === 'then') {
        return undefined;
      }

      if (typeof prop === 'string') {
        console.error('❌ Environment variable validation failed:', validationError.message);
        if (validationError.issues) {
          for (const issue of validationError.issues) {
            const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
            console.error(\`  • \${field}: \${issue.message}\`);
          }
        }
        console.error(\`Attempted to access environment variable: \${prop}\`);
        process.exit(1);
      }
      return undefined;
    },

    has(target, prop) {
      // プロパティの存在チェック時は false を返す（エラーを投げない）
      return false;
    },

    ownKeys(target) {
      // Object.keys() などの呼び出し時は空配列を返す
      return [];
    }
  });
}
`
    : `
// 環境変数処理なし
const globalEnv = {};
async function initializeEnv() { return globalEnv; }
`;

  return `#!/usr/bin/env node

// Generated CLI for ${cliDisplayName}
// Built with decopin-cli
${envImport}
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
