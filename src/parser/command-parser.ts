import * as ts from 'typescript';
import type { CommandDefinition } from '../types/command.js';

/**
 * ファイルからCommandDefinitionを抽出
 */
export function extractCommandDefinition(
  sourceFile: ts.SourceFile
): CommandDefinition | null {
  let commandDefinition: CommandDefinition | null = null;
  let hasHandler = false;

  // 変数宣言を追跡するためのマップ
  const variableDefinitions = new Map<string, CommandDefinition>();

  function visit(node: ts.Node) {
    // export default { ... } の形式を探す
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      if (ts.isObjectLiteralExpression(node.expression)) {
        commandDefinition = parseObjectLiteralAsCommandDefinition(
          node.expression
        );
        hasHandler = true;
      }
      // export default function() { ... } の形式（関数形式のcommandHandler）
      else if (
        ts.isFunctionExpression(node.expression) ||
        ts.isArrowFunction(node.expression)
      ) {
        commandDefinition = {
          handler: async () => {}, // 実際の関数は動的にインポートで取得
        };
        hasHandler = true;
      }
      // export default function name() { ... } の形式（関数形式のcommandHandler）
      else if (ts.isFunctionDeclaration(node.expression)) {
        commandDefinition = {
          handler: async () => {}, // 実際の関数は動的にインポートで取得
        };
        hasHandler = true;
      }
      // export default identifier の形式（変数を参照）
      else if (ts.isIdentifier(node.expression)) {
        const variableName = node.expression.text;
        const variableDefinition = variableDefinitions.get(variableName);
        if (variableDefinition) {
          commandDefinition = variableDefinition;
          hasHandler = true;
        }
      }
      // export default 関数呼び出し（関数形式のcommandHandler）
      else if (ts.isCallExpression(node.expression)) {
        commandDefinition = {
          handler: async () => {}, // 実際の関数は動的にインポートで取得
        };
        hasHandler = true;
      }
    }

    // export default function name() { ... } の形式（関数宣言）
    if (ts.isFunctionDeclaration(node)) {
      const modifiers = ts.canHaveModifiers(node)
        ? ts.getModifiers(node)
        : undefined;
      const hasExport = modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword
      );
      const hasDefault = modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.DefaultKeyword
      );
      if (hasExport && hasDefault) {
        commandDefinition = {
          handler: async () => {}, // 実際の関数は動的にインポートで取得
        };
        hasHandler = true;
      }
    }

    // 変数宣言をチェック（command定義の可能性）
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isVariableDeclaration(declaration) &&
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          const variableName = declaration.name.text;
          const definition = parseObjectLiteralAsCommandDefinition(
            declaration.initializer
          );
          if (definition) {
            variableDefinitions.set(variableName, definition);
          }
        }
      }
    }

    // export const schema = { ... } の形式を探す

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return hasHandler ? commandDefinition : null;
}

/**
 * オブジェクトリテラルをCommandDefinitionとして解析
 */
export function parseObjectLiteralAsCommandDefinition(
  objectLiteral: ts.ObjectLiteralExpression
): CommandDefinition | null {
  const definition: Partial<CommandDefinition> = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const key = property.name.text;

      switch (key) {
        case 'handler':
          definition.handler = async () => {}; // 実際の関数は動的にインポートで取得
          break;
      }
    }
  }

  return definition.handler ? (definition as CommandDefinition) : null;
}
