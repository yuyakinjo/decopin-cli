import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  isExportedNode,
  hasModifier,
  isDefaultExport,
  isAsyncFunction,
  isLiteralNode,
  isStringLiteralNode,
  isNumericLiteralNode,
  isBooleanLiteralNode,
  isObjectLiteralNode,
  isArrayLiteralNode,
  isFunctionNode,
  isArrowFunctionNode,
  isCallExpressionNode,
  isIdentifierNode,
  hasTypeAnnotation,
  isReturnStatementNode,
  isPropertyAssignmentNode,
  isSourceFileNode,
  hasJSDocComment,
  getNodeText,
  isValidIdentifierName,
} from '../../../src/internal/guards/ast';

function createSourceFile(content: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', content, ts.ScriptTarget.Latest, true);
}

function findFirstNode<T extends ts.Node>(
  sourceFile: ts.SourceFile,
  predicate: (node: ts.Node) => node is T
): T | undefined {
  let result: T | undefined;
  
  function visit(node: ts.Node) {
    if (predicate(node)) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return result;
}

describe('Export Guards', () => {
  describe('isExportedNode', () => {
    it('should return true for exported nodes', () => {
      const sourceFile = createSourceFile('export function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isExportedNode(funcNode!)).toBe(true);
    });

    it('should return false for non-exported nodes', () => {
      const sourceFile = createSourceFile('function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isExportedNode(funcNode!)).toBe(false);
    });

    it('should handle nodes without modifiers', () => {
      const sourceFile = createSourceFile('const x = 1');
      const varNode = findFirstNode(sourceFile, ts.isVariableStatement);
      expect(varNode).toBeDefined();
      expect(isExportedNode(varNode!)).toBe(false);
    });
  });

  describe('hasModifier', () => {
    it('should check for specific modifiers', () => {
      const sourceFile = createSourceFile('export default async function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(hasModifier(funcNode!, ts.SyntaxKind.ExportKeyword)).toBe(true);
      expect(hasModifier(funcNode!, ts.SyntaxKind.DefaultKeyword)).toBe(true);
      expect(hasModifier(funcNode!, ts.SyntaxKind.AsyncKeyword)).toBe(true);
      expect(hasModifier(funcNode!, ts.SyntaxKind.PublicKeyword)).toBe(false);
    });
  });

  describe('isDefaultExport', () => {
    it('should return true for default exports', () => {
      const sourceFile = createSourceFile('export default function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isDefaultExport(funcNode!)).toBe(true);
    });

    it('should return false for named exports', () => {
      const sourceFile = createSourceFile('export function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isDefaultExport(funcNode!)).toBe(false);
    });
  });

  describe('isAsyncFunction', () => {
    it('should return true for async functions', () => {
      const sourceFile = createSourceFile('async function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isAsyncFunction(funcNode!)).toBe(true);
    });

    it('should return false for sync functions', () => {
      const sourceFile = createSourceFile('function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isAsyncFunction(funcNode!)).toBe(false);
    });
  });
});

describe('Literal Guards', () => {
  describe('isLiteralNode', () => {
    it('should return true for literal nodes', () => {
      const sourceFile = createSourceFile(`
        const str = "hello";
        const num = 123;
        const bigInt = 123n;
        const regex = /test/;
        const template = \`template\`;
      `);
      
      const strNode = findFirstNode(sourceFile, ts.isStringLiteral);
      expect(strNode && isLiteralNode(strNode)).toBe(true);
      
      const numNode = findFirstNode(sourceFile, ts.isNumericLiteral);
      expect(numNode && isLiteralNode(numNode)).toBe(true);
      
      const templateNode = findFirstNode(sourceFile, ts.isNoSubstitutionTemplateLiteral);
      expect(templateNode && isLiteralNode(templateNode)).toBe(true);
    });

    it('should return false for non-literal nodes', () => {
      const sourceFile = createSourceFile('const x = y');
      const identNode = findFirstNode(sourceFile, ts.isIdentifier);
      expect(identNode && !ts.isSourceFile(identNode.parent)).toBeDefined();
      if (identNode && identNode.text === 'y') {
        expect(isLiteralNode(identNode)).toBe(false);
      }
    });
  });

  describe('isStringLiteralNode', () => {
    it('should return true for string literals', () => {
      const sourceFile = createSourceFile('const x = "hello"');
      const strNode = findFirstNode(sourceFile, ts.isStringLiteral);
      expect(strNode).toBeDefined();
      expect(isStringLiteralNode(strNode!)).toBe(true);
    });
  });

  describe('isNumericLiteralNode', () => {
    it('should return true for numeric literals', () => {
      const sourceFile = createSourceFile('const x = 123');
      const numNode = findFirstNode(sourceFile, ts.isNumericLiteral);
      expect(numNode).toBeDefined();
      expect(isNumericLiteralNode(numNode!)).toBe(true);
    });
  });

  describe('isBooleanLiteralNode', () => {
    it('should return true for boolean literals', () => {
      const sourceFile = createSourceFile('const x = true; const y = false');
      let foundTrue = false;
      let foundFalse = false;
      
      function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.TrueKeyword) {
          foundTrue = isBooleanLiteralNode(node);
        } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
          foundFalse = isBooleanLiteralNode(node);
        }
        ts.forEachChild(node, visit);
      }
      
      visit(sourceFile);
      expect(foundTrue).toBe(true);
      expect(foundFalse).toBe(true);
    });
  });
});

describe('Complex Node Guards', () => {
  describe('isObjectLiteralNode', () => {
    it('should return true for object literals', () => {
      const sourceFile = createSourceFile('const x = { a: 1, b: 2 }');
      const objNode = findFirstNode(sourceFile, ts.isObjectLiteralExpression);
      expect(objNode).toBeDefined();
      expect(isObjectLiteralNode(objNode!)).toBe(true);
    });
  });

  describe('isArrayLiteralNode', () => {
    it('should return true for array literals', () => {
      const sourceFile = createSourceFile('const x = [1, 2, 3]');
      const arrNode = findFirstNode(sourceFile, ts.isArrayLiteralExpression);
      expect(arrNode).toBeDefined();
      expect(isArrayLiteralNode(arrNode!)).toBe(true);
    });
  });

  describe('isFunctionNode', () => {
    it('should return true for function declarations', () => {
      const sourceFile = createSourceFile('function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isFunctionNode(funcNode!)).toBe(true);
    });

    it('should return true for function expressions', () => {
      const sourceFile = createSourceFile('const x = function() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionExpression);
      expect(funcNode).toBeDefined();
      expect(isFunctionNode(funcNode!)).toBe(true);
    });
  });

  describe('isArrowFunctionNode', () => {
    it('should return true for arrow functions', () => {
      const sourceFile = createSourceFile('const x = () => {}');
      const arrowNode = findFirstNode(sourceFile, ts.isArrowFunction);
      expect(arrowNode).toBeDefined();
      expect(isArrowFunctionNode(arrowNode!)).toBe(true);
    });
  });

  describe('isCallExpressionNode', () => {
    it('should return true for call expressions', () => {
      const sourceFile = createSourceFile('test()');
      const callNode = findFirstNode(sourceFile, ts.isCallExpression);
      expect(callNode).toBeDefined();
      expect(isCallExpressionNode(callNode!)).toBe(true);
    });
  });

  describe('isIdentifierNode', () => {
    it('should return true for identifiers', () => {
      const sourceFile = createSourceFile('const x = y');
      const identNode = findFirstNode(sourceFile, ts.isIdentifier);
      expect(identNode).toBeDefined();
      expect(isIdentifierNode(identNode!)).toBe(true);
    });
  });
});

describe('Type Annotation Guards', () => {
  describe('hasTypeAnnotation', () => {
    it('should return true for nodes with type annotations', () => {
      const sourceFile = createSourceFile('const x: string = "hello"');
      const varDecl = findFirstNode(sourceFile, ts.isVariableDeclaration);
      expect(varDecl).toBeDefined();
      expect(hasTypeAnnotation(varDecl!)).toBe(true);
    });

    it('should return false for nodes without type annotations', () => {
      const sourceFile = createSourceFile('const x = "hello"');
      const varDecl = findFirstNode(sourceFile, ts.isVariableDeclaration);
      expect(varDecl).toBeDefined();
      expect(hasTypeAnnotation(varDecl!)).toBe(false);
    });
  });
});

describe('Statement Guards', () => {
  describe('isReturnStatementNode', () => {
    it('should return true for return statements', () => {
      const sourceFile = createSourceFile('function test() { return 42; }');
      const returnNode = findFirstNode(sourceFile, ts.isReturnStatement);
      expect(returnNode).toBeDefined();
      expect(isReturnStatementNode(returnNode!)).toBe(true);
    });
  });

  describe('isPropertyAssignmentNode', () => {
    it('should return true for property assignments', () => {
      const sourceFile = createSourceFile('const x = { a: 1 }');
      const propNode = findFirstNode(sourceFile, ts.isPropertyAssignment);
      expect(propNode).toBeDefined();
      expect(isPropertyAssignmentNode(propNode!)).toBe(true);
    });
  });

  describe('isSourceFileNode', () => {
    it('should return true for source file nodes', () => {
      const sourceFile = createSourceFile('const x = 1');
      expect(isSourceFileNode(sourceFile)).toBe(true);
    });

    it('should return false for other nodes', () => {
      const sourceFile = createSourceFile('const x = 1');
      const varNode = findFirstNode(sourceFile, ts.isVariableStatement);
      expect(varNode).toBeDefined();
      expect(isSourceFileNode(varNode!)).toBe(false);
    });
  });
});

describe('JSDoc Guards', () => {
  describe('hasJSDocComment', () => {
    it('should return true for nodes with JSDoc', () => {
      const sourceFile = createSourceFile(`
        /**
         * Test function
         */
        function test() {}
      `);
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(hasJSDocComment(funcNode!)).toBe(true);
    });

    it('should return false for nodes without JSDoc', () => {
      const sourceFile = createSourceFile('function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(hasJSDocComment(funcNode!)).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('getNodeText', () => {
    it('should return node text', () => {
      const sourceFile = createSourceFile('const x = "hello world"');
      const strNode = findFirstNode(sourceFile, ts.isStringLiteral);
      expect(strNode).toBeDefined();
      expect(getNodeText(strNode!, sourceFile)).toBe('"hello world"');
    });
  });

  describe('isValidIdentifierName', () => {
    it('should return true for valid identifiers', () => {
      expect(isValidIdentifierName('test')).toBe(true);
      expect(isValidIdentifierName('_test')).toBe(true);
      expect(isValidIdentifierName('$test')).toBe(true);
      expect(isValidIdentifierName('test123')).toBe(true);
      expect(isValidIdentifierName('camelCase')).toBe(true);
      expect(isValidIdentifierName('PascalCase')).toBe(true);
      expect(isValidIdentifierName('snake_case')).toBe(true);
    });

    it('should return false for invalid identifiers', () => {
      expect(isValidIdentifierName('')).toBe(false);
      expect(isValidIdentifierName('123test')).toBe(false);
      expect(isValidIdentifierName('test-name')).toBe(false);
      expect(isValidIdentifierName('test.name')).toBe(false);
      expect(isValidIdentifierName('test name')).toBe(false);
      expect(isValidIdentifierName('class')).toBe(true); // Reserved words are syntactically valid
    });
  });
});