import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import type { CommandDefinition } from '../types/command.js';
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

// help-parser.tsから再エクスポート
export { parseHelpFile } from './help-parser.js';
