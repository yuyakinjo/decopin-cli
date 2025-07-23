import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import * as v from 'valibot';
import {
  isDefaultExport,
  isExportedNode,
  isIdentifierNode,
  isObjectLiteralNode,
  isReturnStatementNode,
} from '../internal/guards/ast.js';
import { isString } from '../internal/guards/index.js';
import type { HelpHandler } from '../types/command.js';
import { parseObjectLiteral } from '../utils/ast-utils.js';

/**
 * help.tsファイルからHelpHandlerを抽出
 */
export async function parseHelpFile(
  filePath: string
): Promise<{ help: HelpHandler | null; errors: string[] }> {
  try {
    const content = await readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let helpMetadata: HelpHandler | null = null;
    const errors: string[] = [];

    function visit(node: ts.Node) {
      // export const help = { ... } の形式を探す
      if (ts.isVariableStatement(node)) {
        if (isExportedNode(node)) {
          for (const declaration of node.declarationList.declarations) {
            if (
              ts.isVariableDeclaration(declaration) &&
              isIdentifierNode(declaration.name) &&
              declaration.name.text === 'help' &&
              declaration.initializer &&
              isObjectLiteralNode(declaration.initializer)
            ) {
              helpMetadata = parseHelpMetadata(declaration.initializer);
            }
          }
        }
      }

      // export default function createHelp() { return { ... } } の形式を探す
      if (ts.isFunctionDeclaration(node)) {
        const isExportDefault = isExportedNode(node) && isDefaultExport(node);

        if (isExportDefault && node.name?.text === 'createHelp' && node.body) {
          // 関数本体内のreturn文を探す
          function findReturnStatement(
            block: ts.Block
          ): ts.ObjectLiteralExpression | undefined {
            for (const statement of block.statements) {
              if (
                isReturnStatementNode(statement) &&
                statement.expression &&
                isObjectLiteralNode(statement.expression)
              ) {
                return statement.expression;
              }
            }
            return undefined;
          }

          const returnObject = findReturnStatement(node.body);
          if (returnObject) {
            helpMetadata = parseHelpMetadata(returnObject);
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return { help: helpMetadata, errors };
  } catch (error) {
    return {
      help: null,
      errors: [
        `Failed to parse help file: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * ヘルプメタデータ解析用のスキーマ
 * Parse, Don't Validate: 必須フィールドと任意フィールドを明確に定義
 */
const HelpMetadataSchema = v.object({
  name: v.string(),
  description: v.string(),
  examples: v.optional(
    v.pipe(
      v.array(v.unknown()),
      v.transform((arr) => arr.filter((item): item is string => isString(item)))
    )
  ),
  aliases: v.optional(
    v.pipe(
      v.array(v.unknown()),
      v.transform((arr) => arr.filter((item): item is string => isString(item)))
    )
  ),
  additionalHelp: v.optional(v.string()),
});

/**
 * オブジェクトリテラルからヘルプメタデータを解析
 * Parse, Don't Validate パターンを適用
 */
export function parseHelpMetadata(
  objectLiteral: ts.ObjectLiteralExpression
): HelpHandler | null {
  // parseObjectLiteralを使用して基本的な解析を行う
  const rawMetadata = parseObjectLiteral(objectLiteral);

  // valibotでパース - 必須フィールドの検証も含む
  const parseResult = v.safeParse(HelpMetadataSchema, rawMetadata);

  if (parseResult.success) {
    return parseResult.output as HelpHandler;
  }

  // パースに失敗した場合はnullを返す（必須フィールド不足など）
  return null;
}
