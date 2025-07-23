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
 * Checks if a TypeScript AST node is an async function
 * @param node - The AST node to check
 * @returns True if the node has the async keyword
 * @example
 * ```ts
 * // For code: async function fetchData() {}
 * if (isAsyncFunction(funcNode)) {
 *   console.log('Function is async');
 * }
 * ```
 */
export function isAsyncFunction(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.AsyncKeyword);
}

/**
 * Type guard to check if a node is any kind of literal expression
 * @param node - The AST node to check
 * @returns True if the node is a literal (string, number, bigint, regex, etc.)
 * @example
 * ```ts
 * if (isLiteralNode(node)) {
 *   // node is typed as ts.LiteralExpression
 *   console.log('Found a literal value');
 * }
 * ```
 */
export function isLiteralNode(node: ts.Node): node is ts.LiteralExpression {
  return (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isBigIntLiteral(node) ||
    ts.isRegularExpressionLiteral(node)
  );
}

/**
 * Type guard to check if a node is a string literal
 * @param node - The AST node to check
 * @returns True if the node is a string literal
 * @example
 * ```ts
 * // For code: const name = "hello"
 * if (isStringLiteralNode(node)) {
 *   console.log('String value:', node.text);
 * }
 * ```
 */
export function isStringLiteralNode(node: ts.Node): node is ts.StringLiteral {
  return ts.isStringLiteral(node);
}

/**
 * Type guard to check if a node is a numeric literal
 * @param node - The AST node to check
 * @returns True if the node is a numeric literal
 * @example
 * ```ts
 * // For code: const age = 42
 * if (isNumericLiteralNode(node)) {
 *   console.log('Number value:', node.text);
 * }
 * ```
 */
export function isNumericLiteralNode(node: ts.Node): node is ts.NumericLiteral {
  return ts.isNumericLiteral(node);
}

/**
 * Checks if a node represents a boolean literal (true or false keyword)
 * @param node - The AST node to check
 * @returns True if the node is a true or false keyword
 * @example
 * ```ts
 * // For code: const flag = true
 * if (isBooleanLiteralNode(node)) {
 *   const value = node.kind === ts.SyntaxKind.TrueKeyword;
 * }
 * ```
 */
export function isBooleanLiteralNode(node: ts.Node): boolean {
  return (
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword
  );
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
 * Type guard to check if a node is an array literal expression
 * @param node - The AST node to check
 * @returns True if the node is an array literal
 * @example
 * ```ts
 * // For code: const items = [1, 2, 3]
 * if (isArrayLiteralNode(node)) {
 *   console.log('Elements:', node.elements.length);
 * }
 * ```
 */
export function isArrayLiteralNode(
  node: ts.Node
): node is ts.ArrayLiteralExpression {
  return ts.isArrayLiteralExpression(node);
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

/**
 * Checks if a node has a type annotation
 * @param node - The AST node to check
 * @returns True if the node has a type annotation
 * @example
 * ```ts
 * // For code: const name: string = 'John'
 * if (hasTypeAnnotation(varDeclaration)) {
 *   console.log('Variable has explicit type');
 * }
 * ```
 */
export function hasTypeAnnotation(node: ts.Node): boolean {
  if ('type' in node && node.type) {
    return true;
  }
  return false;
}

/**
 * Type guard to check if a node is a return statement
 * @param node - The AST node to check
 * @returns True if the node is a return statement
 * @example
 * ```ts
 * // For code: return 42
 * if (isReturnStatementNode(node)) {
 *   console.log('Return expression:', node.expression);
 * }
 * ```
 */
export function isReturnStatementNode(
  node: ts.Node
): node is ts.ReturnStatement {
  return ts.isReturnStatement(node);
}

/**
 * Type guard to check if a node is a property assignment in an object literal
 * @param node - The AST node to check
 * @returns True if the node is a property assignment
 * @example
 * ```ts
 * // For code: { name: 'John' }
 * if (isPropertyAssignmentNode(node)) {
 *   console.log('Property:', node.name);
 * }
 * ```
 */
export function isPropertyAssignmentNode(
  node: ts.Node
): node is ts.PropertyAssignment {
  return ts.isPropertyAssignment(node);
}

/**
 * Type guard to check if a node is a source file (root AST node)
 * @param node - The AST node to check
 * @returns True if the node is a source file
 * @example
 * ```ts
 * if (isSourceFileNode(node)) {
 *   console.log('File name:', node.fileName);
 * }
 * ```
 */
export function isSourceFileNode(node: ts.Node): node is ts.SourceFile {
  return ts.isSourceFile(node);
}

/**
 * Checks if a node has JSDoc comments attached
 * @param node - The AST node to check
 * @returns True if the node has JSDoc comments
 * @example
 * ```ts
 * if (hasJSDocComment(funcNode)) {
 *   console.log('Function is documented');
 * }
 * ```
 */
export function hasJSDocComment(node: ts.Node): boolean {
  const jsDocComments = ts.getJSDocCommentsAndTags(node);
  return jsDocComments.length > 0;
}

/**
 * Gets the text content of an AST node
 * @param node - The AST node to get text from
 * @param sourceFile - The source file containing the node
 * @returns The text content of the node
 * @example
 * ```ts
 * const text = getNodeText(node, sourceFile);
 * console.log('Node text:', text);
 * ```
 */
export function getNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile);
}

/**
 * Checks if a string is a valid JavaScript/TypeScript identifier name
 * @param name - The string to check
 * @returns True if the string is a valid identifier
 * @example
 * ```ts
 * isValidIdentifierName('myVar')     // true
 * isValidIdentifierName('$value')    // true
 * isValidIdentifierName('_private')  // true
 * isValidIdentifierName('123abc')    // false
 * isValidIdentifierName('my-var')    // false
 * ```
 */
export function isValidIdentifierName(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}
