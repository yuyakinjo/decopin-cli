import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import * as v from 'valibot';
import type { CommandHelpMetadata } from '../types/command.js';
import { parseObjectLiteral } from '../utils/ast-utils.js';

/**
 * help.tsファイルからCommandHelpMetadataを抽出
 */
export async function parseHelpFile(
  filePath: string
): Promise<{ help: CommandHelpMetadata | null; errors: string[] }> {
  try {
    const content = await readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let helpMetadata: CommandHelpMetadata | null = null;
    const errors: string[] = [];

    function visit(node: ts.Node) {
      // export const help = { ... } の形式を探す
      if (ts.isVariableStatement(node)) {
        const modifiers = ts.canHaveModifiers(node)
          ? ts.getModifiers(node)
          : undefined;
        const isExported = modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        );

        if (isExported) {
          for (const declaration of node.declarationList.declarations) {
            if (
              ts.isVariableDeclaration(declaration) &&
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === 'help' &&
              declaration.initializer &&
              ts.isObjectLiteralExpression(declaration.initializer)
            ) {
              helpMetadata = parseHelpMetadata(declaration.initializer);
            }
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
      v.transform((arr) =>
        arr.filter((item): item is string => typeof item === 'string')
      )
    )
  ),
  aliases: v.optional(
    v.pipe(
      v.array(v.unknown()),
      v.transform((arr) =>
        arr.filter((item): item is string => typeof item === 'string')
      )
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
): CommandHelpMetadata | null {
  // parseObjectLiteralを使用して基本的な解析を行う
  const rawMetadata = parseObjectLiteral(objectLiteral);

  // valibotでパース - 必須フィールドの検証も含む
  const parseResult = v.safeParse(HelpMetadataSchema, rawMetadata);

  if (parseResult.success) {
    return parseResult.output as CommandHelpMetadata;
  }

  // パースに失敗した場合はnullを返す（必須フィールド不足など）
  return null;
}
