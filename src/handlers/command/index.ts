/**
 * Command handler - handles command.ts files
 * This module is lazy-loaded when commands need to be processed
 */

import type { CLIStructure, CommandFile } from '../../core/types.js';
import type { CommandContext } from '../../types/context.js';
import type {
  CommandHandlerFactory,
  ParsedCommandDefinition,
} from './types.js';

// Lazy-loaded parser module
let parserModule: typeof import('./parser.js') | null = null;
async function getParser() {
  if (!parserModule) {
    parserModule = await import('./parser.js');
  }
  return parserModule;
}

// Lazy-loaded generator module
let generatorModule: typeof import('./generator.js') | null = null;
async function getGenerator() {
  if (!generatorModule) {
    generatorModule = await import('./generator.js');
  }
  return generatorModule;
}

export async function parseCommands(
  files: CommandFile[]
): Promise<ParsedCommandDefinition[]> {
  // Parser module is initialized here
  const parser = await getParser();
  return parser.parseFiles(files);
}

export async function generateCommands(
  commands: ParsedCommandDefinition[],
  structure?: CLIStructure
): Promise<string> {
  // Generator module is initialized here
  const generator = await getGenerator();
  const result = await generator.generate(commands, structure);
  return result.content;
}

// Re-export types (no runtime cost)
export type {
  CommandDefinitionFactory,
  CommandMetadata,
  DynamicParam,
  ParsedCommand,
  ParsedCommandDefinition,
  RuntimeCommandDefinition,
} from './types.js';
/**
 * コマンド定義を解析する
 *
 * @param files - 解析するファイルパスの配列
 * @returns 解析されたコマンド定義の配列
 */
export async function parseCommandDefinitions(
  files: string[]
): Promise<ParsedCommandDefinition[]> {
  const definitions: ParsedCommandDefinition[] = [];

  for (const file of files) {
    try {
      // ファイルパスからコマンド名を生成
      const segments = file.replace(/\/command\.ts$/, '').split('/');
      const name = segments.join(' ');

      definitions.push({
        name,
        path: file,
        hasParams: false, // 実際の実装では params.ts の存在をチェック
        hasHelp: false, // 実際の実装では help.ts の存在をチェック
        hasError: false, // 実際の実装では error.ts の存在をチェック
      });
    } catch (error) {}
  }

  return definitions;
}

/**
 * コマンドハンドラーを作成する（ファクトリー版）
 *
 * @param factory - コマンドハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @returns コマンドハンドラー
 */
export async function createCommandHandlerFromFactory<
  T = unknown,
  E = typeof process.env,
>(
  factory: CommandHandlerFactory<T, E>,
  context: CommandContext<T, E>
): Promise<void> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
}

/**
 * コマンドハンドラーを作成する（テスト用インターフェース）
 *
 * @param definition - コマンド定義
 * @returns コマンドハンドラーインターフェース
 */
export function createCommandHandler<T = unknown>(
  definition: import('./types.js').CommandDefinition<T>
): import('./types.js').CommandHandlerInterface {
  return {
    execute: async (context, args, options) => {
      const commandContext = {
        ...context,
        args,
        options,
        command: definition.name.split(' '),
      };
      await definition.handler(commandContext);
    },
  };
}
