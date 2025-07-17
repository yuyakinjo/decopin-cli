import * as ts from 'typescript';

/**
 * TypeScript ASTからリテラル値を抽出
 */
export function extractLiteralValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => extractLiteralValue(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return parseObjectLiteral(node);
  }
  return undefined;
}

/**
 * オブジェクトリテラルを解析してJavaScriptオブジェクトに変換
 */
export function parseObjectLiteral(
  objectLiteral: ts.ObjectLiteralExpression
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const propertyName = property.name.text;
      const value = extractLiteralValue(property.initializer);
      if (value !== undefined) {
        result[propertyName] = value;
      }
    }
  }

  return result;
}

/**
 * ノードがエクスポートされた変数宣言かどうかを判定
 */
export function isExportedVariableStatement(
  node: ts.Node
): node is ts.VariableStatement {
  return (
    ts.isVariableStatement(node) &&
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword
    ) === true
  );
}

/**
 * ノードがエクスポートデフォルト代入かどうかを判定
 */
export function isExportDefaultAssignment(
  node: ts.Node
): node is ts.ExportAssignment {
  return ts.isExportAssignment(node) && !node.isExportEquals;
}

/**
 * 変数宣言から特定の名前の変数を検索
 */
export function findVariableDeclaration(
  statement: ts.VariableStatement,
  name: string
): ts.VariableDeclaration | undefined {
  return statement.declarationList.declarations.find(
    (declaration) =>
      ts.isVariableDeclaration(declaration) &&
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === name
  );
}
