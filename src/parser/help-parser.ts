import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import type { CommandHelpMetadata } from '../types/command.js';

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
              helpMetadata = parseObjectLiteralAsHelpMetadata(
                declaration.initializer
              );
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
 * オブジェクトリテラルをCommandHelpMetadataとして解析
 */
function parseObjectLiteralAsHelpMetadata(
  objectLiteral: ts.ObjectLiteralExpression
): CommandHelpMetadata | null {
  const metadata: Partial<CommandHelpMetadata> = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const key = property.name.text;
      const value = property.initializer;

      switch (key) {
        case 'name':
          if (ts.isStringLiteral(value)) {
            metadata.name = value.text;
          }
          break;
        case 'description':
          if (ts.isStringLiteral(value)) {
            metadata.description = value.text;
          }
          break;
        case 'examples':
          if (ts.isArrayLiteralExpression(value)) {
            metadata.examples = value.elements
              .filter(ts.isStringLiteral)
              .map((el) => el.text);
          }
          break;
        case 'aliases':
          if (ts.isArrayLiteralExpression(value)) {
            metadata.aliases = value.elements
              .filter(ts.isStringLiteral)
              .map((el) => el.text);
          }
          break;
        case 'additionalHelp':
          if (ts.isStringLiteral(value)) {
            metadata.additionalHelp = value.text;
          }
          break;
      }
    }
  }

  // name と description は必須
  if (metadata.name && metadata.description) {
    return metadata as CommandHelpMetadata;
  }

  return null;
}
