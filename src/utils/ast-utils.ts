import * as ts from 'typescript';

/**
 * TypeScript ASTノードから値を抽出するパターンマッチング関数
 * Parse, Don't Validate パターンを適用
 */
type LiteralExtractor<T> = (node: ts.Expression) => T | undefined;

const stringExtractor: LiteralExtractor<string> = (node) =>
  ts.isStringLiteral(node) ? node.text : undefined;

const numberExtractor: LiteralExtractor<number> = (node) =>
  ts.isNumericLiteral(node) ? Number(node.text) : undefined;

const booleanExtractor: LiteralExtractor<boolean> = (node) => {
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
};

const nullExtractor: LiteralExtractor<null> = (node) =>
  node.kind === ts.SyntaxKind.NullKeyword ? null : undefined;

const arrayExtractor: LiteralExtractor<unknown[]> = (node) =>
  ts.isArrayLiteralExpression(node)
    ? node.elements.map((element) => extractLiteralValue(element))
    : undefined;

const objectExtractor: LiteralExtractor<Record<string, unknown>> = (node) =>
  ts.isObjectLiteralExpression(node) ? parseObjectLiteral(node) : undefined;

/**
 * 抽出関数のパイプライン
 */
const extractors = [
  stringExtractor,
  numberExtractor,
  booleanExtractor,
  nullExtractor,
  arrayExtractor,
  objectExtractor,
] as const;

/**
 * TypeScript ASTからリテラル値を抽出
 * 関数型パターンマッチングアプローチ
 */
export function extractLiteralValue(node: ts.Expression): unknown {
  // 各エクストラクターを試行し、最初に成功したものの結果を返す
  for (const extractor of extractors) {
    const result = extractor(node);
    if (result !== undefined) {
      return result;
    }
  }

  // どのパターンにもマッチしない場合
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
