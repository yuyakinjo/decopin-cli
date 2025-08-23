import { describe, it, expect } from 'bun:test';
import ts from 'typescript';
import {
  isExportedNode,
  hasModifier,
  isDefaultExport,
  isObjectLiteralNode,
  isFunctionNode,
  isArrowFunctionNode,
  isCallExpressionNode,
  isIdentifierNode,
} from '../../../src/utils/guards/ast.js';

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

describe('AST Guards', () => {
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

  describe('isObjectLiteralNode', () => {
    it('should identify object literal expressions', () => {
      const sourceFile = createSourceFile('const obj = { a: 1 };');
      const objNode = findFirstNode(sourceFile, ts.isObjectLiteralExpression);
      expect(objNode).toBeDefined();
      expect(isObjectLiteralNode(objNode!)).toBe(true);
    });

    it('should return false for non-object literals', () => {
      const sourceFile = createSourceFile('const arr = [1, 2];');
      const arrNode = findFirstNode(sourceFile, ts.isArrayLiteralExpression);
      expect(arrNode).toBeDefined();
      expect(isObjectLiteralNode(arrNode!)).toBe(false);
    });
  });

  describe('isFunctionNode', () => {
    it('should identify function declarations', () => {
      const sourceFile = createSourceFile('function test() {}');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionDeclaration);
      expect(funcNode).toBeDefined();
      expect(isFunctionNode(funcNode!)).toBe(true);
    });

    it('should identify function expressions', () => {
      const sourceFile = createSourceFile('const fn = function() {};');
      const funcNode = findFirstNode(sourceFile, ts.isFunctionExpression);
      expect(funcNode).toBeDefined();
      expect(isFunctionNode(funcNode!)).toBe(true);
    });
  });

  describe('isArrowFunctionNode', () => {
    it('should identify arrow functions', () => {
      const sourceFile = createSourceFile('const fn = () => {};');
      const arrowNode = findFirstNode(sourceFile, ts.isArrowFunction);
      expect(arrowNode).toBeDefined();
      expect(isArrowFunctionNode(arrowNode!)).toBe(true);
    });
  });

  describe('isCallExpressionNode', () => {
    it('should identify function calls', () => {
      const sourceFile = createSourceFile('console.log("test");');
      const callNode = findFirstNode(sourceFile, ts.isCallExpression);
      expect(callNode).toBeDefined();
      expect(isCallExpressionNode(callNode!)).toBe(true);
    });
  });

  describe('isIdentifierNode', () => {
    it('should identify identifiers', () => {
      const sourceFile = createSourceFile('const test = 123;');
      const identNode = findFirstNode(sourceFile, ts.isIdentifier);
      expect(identNode).toBeDefined();
      expect(isIdentifierNode(identNode!)).toBe(true);
    });
  });
});