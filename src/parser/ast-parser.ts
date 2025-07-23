import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import type { CommandDefinition } from '../types/command.js';
import type { EnvSchema } from '../types/validation.js';
import { extractCommandDefinition } from './command-parser.js';

/**
 * TypeScript AST解析結果
 */
export interface ParsedASTResult {
  /** コマンド定義 */
  definition: CommandDefinition;
  /** 解析エラー */
  errors: string[];
  /** 解析警告 */
  warnings: string[];
}

/**
 * 環境変数定義の解析結果
 */
export interface ParsedEnvResult {
  /** 環境変数スキーマ */
  envSchema: EnvSchema | null;
  /** 解析エラー */
  errors: string[];
  /** 解析警告 */
  warnings: string[];
}

/**
 * TypeScriptファイルを解析してコマンド定義を抽出
 */
export async function parseCommandFile(
  filePath: string
): Promise<ParsedASTResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // ファイルを読み込み
    const sourceCode = await readFile(filePath, 'utf-8');

    // TypeScript AST にパース
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // パフォーマンス優先: 診断処理をスキップ
    // TypeScriptコンパイラは別途実行されるため、ここでの詳細チェックは不要

    // コマンド定義を抽出
    const definition = extractCommandDefinition(sourceFile);

    if (!definition) {
      errors.push(`No valid command definition found in ${filePath}`);
      return {
        definition: { handler: async () => {} },
        errors,
        warnings,
      };
    }

    return {
      definition,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Failed to parse file ${filePath}: ${error}`);
    return {
      definition: { handler: async () => {} },
      errors,
      warnings,
    };
  }
}

/**
 * 複数のコマンドファイルを一括解析
 */
export async function parseMultipleCommandFiles(
  filePaths: string[]
): Promise<Map<string, ParsedASTResult>> {
  const results = new Map<string, ParsedASTResult>();

  // 並列処理で高速化
  const parsePromises = filePaths.map(async (filePath) => {
    const result = await parseCommandFile(filePath);
    return [filePath, result] as const;
  });

  const parsedResults = await Promise.all(parsePromises);

  for (const [filePath, result] of parsedResults) {
    results.set(filePath, result);
  }

  return results;
}

/**
 * env.tsファイルを解析して環境変数定義を抽出
 */
export async function parseEnvFile(filePath: string): Promise<ParsedEnvResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // ファイルを読み込み
    const sourceCode = await readFile(filePath, 'utf-8');

    // TypeScript AST にパース
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // env.tsはdefault export関数を期待
    // function createEnv(): EnvHandler { ... }
    // export default createEnv;
    let envSchema: EnvSchema | null = null;

    ts.forEachChild(sourceFile, (node) => {
      // export default functionの検出
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'createEnv') {
        // 関数の戻り値からスキーマを推定
        // 実際の実装では、関数定義をコンパイル時に評価するのは複雑なため、
        // 動的インポートに任せる（ランタイムでの解析）
        envSchema = {}; // プレースホルダー
      }
    });

    if (!envSchema) {
      warnings.push(
        `env.ts file found but no createEnv function detected in ${filePath}. Will attempt dynamic import at runtime.`
      );
      envSchema = {}; // 空のスキーマでもランタイムで処理する
    }

    return {
      envSchema,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Failed to parse env file ${filePath}: ${error}`);
    return {
      envSchema: null,
      errors,
      warnings,
    };
  }
}

// help-parser.tsから再エクスポート
export { parseHelpFile } from './help-parser.js';
