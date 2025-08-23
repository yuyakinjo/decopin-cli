import type {
  VersionComparisonResult,
  VersionContext,
  VersionDisplayOptions,
  VersionExecutionOptions,
  VersionHandler,
  VersionHandlerFactory,
  VersionProcessingResult,
} from './types.js';

/**
 * バージョンハンドラーを処理する
 *
 * @param options - バージョンハンドラーの実行オプション
 * @returns バージョン処理の結果
 */
export async function processVersionHandler<E = typeof process.env>(
  options: VersionExecutionOptions<E>
): Promise<VersionProcessingResult> {
  try {
    const { factory, context } = options;

    // ファクトリー関数を実行してバージョンハンドラーを取得
    const handler =
      typeof factory === 'function' ? await factory(context) : factory;

    return {
      handler,
      context: context as VersionContext,
      success: true,
    };
  } catch (error) {
    // エラーが発生した場合はデフォルトのバージョンハンドラーを返す
    const defaultHandler = createDefaultVersionHandler();

    return {
      handler: defaultHandler,
      context: options.context as VersionContext,
      success: false,
      error,
    };
  }
}

/**
 * バージョンハンドラーを実行してバージョン情報を取得する
 *
 * @param factory - バージョンハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @returns バージョンハンドラー
 */
export async function executeVersionHandler<E = typeof process.env>(
  factory: VersionHandlerFactory<E>,
  context: VersionContext<E>
): Promise<VersionHandler> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
  return factory;
}

/**
 * バージョンハンドラーの妥当性を検証する
 *
 * @param handler - 検証するバージョンハンドラー
 * @returns 妥当性検証の結果
 */
export function validateVersionHandler(handler: VersionHandler): boolean {
  return (
    typeof handler === 'object' &&
    handler !== null &&
    typeof handler.version === 'string' &&
    handler.version.length > 0
  );
}

/**
 * デフォルトのバージョンハンドラーを作成する
 *
 * @param version - バージョン番号（省略時は '1.0.0'）
 * @returns デフォルトのバージョンハンドラー
 */
export function createDefaultVersionHandler(
  version: string = '1.0.0'
): VersionHandler {
  return {
    version,
    metadata: {
      name: 'cli-app',
      version,
      description: 'Command line application',
      author: 'Unknown',
    },
  };
}

/**
 * バージョン情報をフォーマットして表示用の文字列を生成する
 *
 * @param handler - バージョンハンドラー
 * @param options - 表示オプション
 * @returns フォーマットされたバージョン文字列
 */
export function formatVersionOutput(
  handler: VersionHandler,
  options: VersionDisplayOptions = {}
): string {
  const { verbose = false, json = false, includeMetadata = true } = options;

  if (json) {
    const output = {
      version: handler.version,
      ...(includeMetadata && handler.metadata
        ? { metadata: handler.metadata }
        : {}),
    };
    return JSON.stringify(output, null, 2);
  }

  if (!verbose) {
    return handler.version;
  }

  const lines: string[] = [];

  // バージョン番号
  lines.push(`Version: ${handler.version}`);

  // メタデータ
  if (includeMetadata && handler.metadata) {
    const metadata = handler.metadata;

    if (metadata.name) {
      lines.push(`Name: ${metadata.name}`);
    }

    if (metadata.description) {
      lines.push(`Description: ${metadata.description}`);
    }

    if (metadata.author) {
      lines.push(`Author: ${metadata.author}`);
    }

    // その他のメタデータ
    const standardFields = new Set([
      'name',
      'version',
      'description',
      'author',
    ]);
    const customFields = Object.entries(metadata).filter(
      ([key]) => !standardFields.has(key)
    );

    if (customFields.length > 0) {
      lines.push('');
      lines.push('Additional Information:');
      for (const [key, value] of customFields) {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * バージョン番号を比較する
 *
 * @param current - 現在のバージョン
 * @param target - 比較対象のバージョン
 * @returns バージョン比較結果
 */
export function compareVersions(
  current: string,
  target: string
): VersionComparisonResult {
  try {
    const currentParts = parseVersion(current);
    const targetParts = parseVersion(target);

    for (
      let i = 0;
      i < Math.max(currentParts.length, targetParts.length);
      i++
    ) {
      const currentPart = currentParts[i] || 0;
      const targetPart = targetParts[i] || 0;

      if (currentPart < targetPart) {
        return { comparison: -1, current, target, valid: true };
      } else if (currentPart > targetPart) {
        return { comparison: 1, current, target, valid: true };
      }
    }

    return { comparison: 0, current, target, valid: true };
  } catch (_error) {
    return { comparison: 0, current, target, valid: false };
  }
}

/**
 * バージョン文字列をパースして数値配列に変換する
 *
 * @param version - バージョン文字列
 * @returns パースされたバージョン番号の配列
 */
function parseVersion(version: string): number[] {
  // セマンティックバージョニング形式をサポート (例: 1.2.3, 1.2.3-alpha.1)
  const cleanVersion = version.split('-')[0]; // プレリリース部分を除去
  const parts = cleanVersion.split('.').map((part) => {
    const num = parseInt(part, 10);
    if (Number.isNaN(num)) {
      throw new Error(`Invalid version part: ${part}`);
    }
    return num;
  });

  if (parts.length === 0) {
    throw new Error(`Invalid version format: ${version}`);
  }

  return parts;
}

/**
 * バージョン番号が有効かどうかを検証する
 *
 * @param version - 検証するバージョン文字列
 * @returns バージョンが有効かどうか
 */
export function isValidVersion(version: string): boolean {
  try {
    parseVersion(version);
    return true;
  } catch {
    return false;
  }
}

/**
 * 環境変数からバージョン情報を構築する
 *
 * @param env - 環境変数オブジェクト
 * @returns バージョンハンドラー
 */
export function createVersionFromEnvironment(
  env: Record<string, string | undefined>
): VersionHandler {
  const version = env.VERSION || env.npm_package_version || '1.0.0';
  const name = env.npm_package_name || 'cli-app';
  const description = env.npm_package_description || 'Command line application';
  const author = env.npm_package_author || 'Unknown';

  return {
    version,
    metadata: {
      name,
      version,
      description,
      author,
      ...(env.BUILD_NUMBER && { build: env.BUILD_NUMBER }),
      ...(env.GIT_COMMIT && { commit: env.GIT_COMMIT }),
      ...(env.NODE_ENV && { environment: env.NODE_ENV }),
    },
  };
}
/**
 * バージョンハンドラーを作成する（ファクトリー版）
 *
 * @param factory - バージョンハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @returns バージョンハンドラー
 */
export async function createVersionHandlerFromFactory<E = typeof process.env>(
  factory: VersionHandlerFactory<E>,
  context: VersionContext<E>
): Promise<VersionHandler> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
  return factory;
}

/**
 * バージョンハンドラーを作成する（テスト用インターフェース）
 *
 * @param definition - バージョン定義
 * @returns バージョンハンドラーインターフェース
 */
export function createVersionHandler(
  definition: import('./types.js').VersionDefinition
): import('./types.js').VersionHandlerInterface {
  return {
    getVersion: () => {
      const handler: VersionHandler = {
        version: definition.version,
        metadata: {
          name: definition.name || undefined,
          version: definition.version,
          description: definition.description || undefined,
          ...definition.buildInfo,
        },
      };
      return formatVersionOutput(handler, { verbose: true });
    },
  };
}

/**
 * バージョン情報をフォーマットする（シンプル版）
 *
 * @param definition - バージョン定義またはバージョンハンドラー
 * @returns フォーマットされたバージョン文字列
 */
export function formatVersion(
  definition: import('./types.js').VersionDefinition | VersionHandler
): string {
  // Check if it's a VersionDefinition or VersionHandler
  if ('name' in definition && !('metadata' in definition)) {
    // It's a VersionDefinition
    const versionDef = definition as import('./types.js').VersionDefinition;
    const handler: VersionHandler = {
      version: versionDef.version,
      metadata: {
        name: versionDef.name || undefined,
        version: versionDef.version,
        description: versionDef.description || undefined,
        ...versionDef.buildInfo,
      },
    };
    return formatVersionOutput(handler, { verbose: true });
  } else {
    // It's a VersionHandler
    return formatVersionOutput(definition as VersionHandler, { verbose: true });
  }
}
