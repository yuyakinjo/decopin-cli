import ts from 'typescript';

/**
 * Checks if a TypeScript AST node has an export modifier
 * @param node - The AST node to check
 * @returns True if the node is exported
 * @example
 * ```ts
 * // For code: export function myFunc() {}
 * const funcNode = // ... get function node
 * if (isExportedNode(funcNode)) {
 *   console.log('Function is exported');
 * }
 * ```
 */
export function isExportedNode(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }

  const modifiers = ts.getModifiers(node);
  if (!modifiers) {
    return false;
  }

  return modifiers.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );
}

/**
 * Checks if a TypeScript AST node has a specific modifier
 * @param node - The AST node to check
 * @param kind - The syntax kind of the modifier to check for
 * @returns True if the node has the specified modifier
 * @example
 * ```ts
 * if (hasModifier(node, ts.SyntaxKind.AsyncKeyword)) {
 *   console.log('Node is async');
 * }
 * ```
 */
export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (!ts.canHaveModifiers(node)) {
    return false;
  }

  const modifiers = ts.getModifiers(node);
  if (!modifiers) {
    return false;
  }

  return modifiers.some((modifier) => modifier.kind === kind);
}

/**
 * Checks if a TypeScript AST node is a default export
 * @param node - The AST node to check
 * @returns True if the node has the default keyword
 * @example
 * ```ts
 * // For code: export default function() {}
 * if (isDefaultExport(funcNode)) {
 *   console.log('This is a default export');
 * }
 * ```
 */
export function isDefaultExport(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.DefaultKeyword);
}

/**
 * Type guard to check if a node is an object literal expression
 * @param node - The AST node to check
 * @returns True if the node is an object literal
 * @example
 * ```ts
 * // For code: const config = { host: 'localhost' }
 * if (isObjectLiteralNode(node)) {
 *   console.log('Properties:', node.properties.length);
 * }
 * ```
 */
export function isObjectLiteralNode(
  node: ts.Node
): node is ts.ObjectLiteralExpression {
  return ts.isObjectLiteralExpression(node);
}

/**
 * Type guard to check if a node is a function declaration or expression
 * @param node - The AST node to check
 * @returns True if the node is a function declaration or expression
 * @example
 * ```ts
 * if (isFunctionNode(node)) {
 *   console.log('Function name:', node.name?.text);
 * }
 * ```
 */
export function isFunctionNode(
  node: ts.Node
): node is ts.FunctionDeclaration | ts.FunctionExpression {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node);
}

/**
 * Type guard to check if a node is an arrow function
 * @param node - The AST node to check
 * @returns True if the node is an arrow function
 * @example
 * ```ts
 * // For code: const fn = () => {}
 * if (isArrowFunctionNode(node)) {
 *   console.log('Found arrow function');
 * }
 * ```
 */
export function isArrowFunctionNode(node: ts.Node): node is ts.ArrowFunction {
  return ts.isArrowFunction(node);
}

/**
 * Type guard to check if a node is a call expression
 * @param node - The AST node to check
 * @returns True if the node is a function call
 * @example
 * ```ts
 * // For code: console.log('hello')
 * if (isCallExpressionNode(node)) {
 *   console.log('Arguments:', node.arguments.length);
 * }
 * ```
 */
export function isCallExpressionNode(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node);
}

/**
 * Type guard to check if a node is an identifier
 * @param node - The AST node to check
 * @returns True if the node is an identifier
 * @example
 * ```ts
 * // For code: const myVariable = 123
 * if (isIdentifierNode(node)) {
 *   console.log('Identifier name:', node.text);
 * }
 * ```
 */
export function isIdentifierNode(node: ts.Node): node is ts.Identifier {
  return ts.isIdentifier(node);
}

