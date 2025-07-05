import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';
import type { CommandDefinition, CommandMetadata, CommandSchema } from '../types/command.js';

/**
 * TypeScript AST解析結果
 */
export interface ParsedASTResult {
  /** コマンド定義 */
  definition: CommandDefinition;
  /** 解析エラー */
  errors: string[];
  /** 解析警告 */
  warnings: string[];
}

/**
 * ファイルからCommandDefinitionを抽出
 */
function extractCommandDefinition(sourceFile: ts.SourceFile): CommandDefinition | null {
  let commandDefinition: CommandDefinition | null = null;
  let hasHandler = false;
  let metadata: CommandMetadata | undefined;
  let schema: CommandSchema | undefined;

  function visit(node: ts.Node) {
    // export default { ... } の形式を探す
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      if (ts.isObjectLiteralExpression(node.expression)) {
        commandDefinition = parseObjectLiteralAsCommandDefinition(node.expression);
        hasHandler = true;
      }
      // export default function() { ... } の形式
      else if (ts.isFunctionExpression(node.expression) || ts.isArrowFunction(node.expression)) {
        hasHandler = true;
      }
      // export default function name() { ... } の形式
      else if (ts.isFunctionDeclaration(node.expression)) {
        hasHandler = true;
      }
    }

    // export default function name() { ... } の形式（関数宣言）
    if (ts.isFunctionDeclaration(node)) {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const hasDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (hasExport && hasDefault) {
        hasHandler = true;
      }
    }

    // 名前付きエクスポートを探す: export const metadata = { ... }
    if (ts.isVariableStatement(node)) {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            const name = declaration.name.text;
            if (name === 'metadata' && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
              metadata = parseMetadata(declaration.initializer);
            }
            if (name === 'schema' && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
              schema = parseSchema(declaration.initializer);
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // 分離された形式の場合、結合する
  if (hasHandler && (metadata || schema)) {
    commandDefinition = {
      handler: async () => {}, // 実際の関数は動的にインポートで取得
      ...(metadata && { metadata }),
      ...(schema && { schema }),
    };
  }

  // handlerのみが存在する場合
  if (hasHandler && !commandDefinition) {
    commandDefinition = {
      handler: async () => {},
    };
  }

  return commandDefinition;
}

/**
 * オブジェクトリテラルをCommandDefinitionに変換
 */
function parseObjectLiteralAsCommandDefinition(
  objectLiteral: ts.ObjectLiteralExpression
): CommandDefinition {
  const definition: Partial<CommandDefinition> = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const propertyName = property.name.text;

      switch (propertyName) {
        case 'metadata':
          if (ts.isObjectLiteralExpression(property.initializer)) {
            definition.metadata = parseMetadata(property.initializer);
          }
          break;
        case 'schema':
          if (ts.isObjectLiteralExpression(property.initializer)) {
            definition.schema = parseSchema(property.initializer);
          }
          break;
        case 'middleware':
          // middleware は配列として解析（詳細は省略）
          definition.middleware = [];
          break;
        case 'handler':
          // handler は関数として解析（実際の実装は動的インポートで取得）
          definition.handler = async () => {};
          break;
      }
    }
  }

  // handlerは必須なので、存在しない場合はデフォルトを設定
  if (!definition.handler) {
    definition.handler = async () => {};
  }

  return definition as CommandDefinition;
}

/**
 * メタデータオブジェクトを解析
 */
function parseMetadata(objectLiteral: ts.ObjectLiteralExpression): CommandMetadata {
  const metadata: CommandMetadata = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const propertyName = property.name.text;
      const value = extractLiteralValue(property.initializer);

      switch (propertyName) {
        case 'name':
          if (typeof value === 'string') metadata.name = value;
          break;
        case 'description':
          if (typeof value === 'string') metadata.description = value;
          break;
        case 'examples':
          if (Array.isArray(value)) metadata.examples = value;
          break;
        case 'aliases':
          if (Array.isArray(value)) metadata.aliases = value;
          break;
      }
    }
  }

  return metadata;
}

/**
 * スキーマオブジェクトを解析
 */
function parseSchema(objectLiteral: ts.ObjectLiteralExpression): CommandSchema {
  const schema: CommandSchema = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const propertyName = property.name.text;

      switch (propertyName) {
        case 'args':
          // valibot スキーマの解析（簡略化）
          schema.args = {} as any;
          break;
        case 'options':
          // valibot スキーマの解析（簡略化）
          schema.options = {} as any;
          break;
      }
    }
  }

  return schema;
}

/**
 * リテラル値を抽出
 */
function extractLiteralValue(node: ts.Expression): any {
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
    return node.elements.map(extractLiteralValue);
  }

  return undefined;
}

/**
 * TypeScriptファイルを解析してコマンド定義を抽出
 */
export async function parseCommandFile(filePath: string): Promise<ParsedASTResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // ファイルを読み込み
    const sourceCode = await readFile(filePath, 'utf-8');

    // TypeScript AST にパース
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // 構文エラーをチェック
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filePath], {}));
    for (const diagnostic of diagnostics) {
      if (diagnostic.messageText) {
        const message = typeof diagnostic.messageText === 'string'
          ? diagnostic.messageText
          : diagnostic.messageText.messageText;
        errors.push(message);
      }
    }

    // コマンド定義を抽出
    const definition = extractCommandDefinition(sourceFile);

    if (!definition) {
      errors.push(`No valid command definition found in ${filePath}`);
      return {
        definition: { handler: async () => {} },
        errors,
        warnings,
      };
    }

    return {
      definition,
      errors,
      warnings,
    };

  } catch (error) {
    errors.push(`Failed to parse file ${filePath}: ${error}`);
    return {
      definition: { handler: async () => {} },
      errors,
      warnings,
    };
  }
}

/**
 * コマンドファイルが有効な形式かチェック
 */
export async function validateCommandFile(filePath: string): Promise<boolean> {
  const result = await parseCommandFile(filePath);
  return result.errors.length === 0;
}

/**
 * 複数のコマンドファイルを一括解析
 */
export async function parseMultipleCommandFiles(
  filePaths: string[]
): Promise<Map<string, ParsedASTResult>> {
  const results = new Map<string, ParsedASTResult>();

  // 並列処理で高速化
  const parsePromises = filePaths.map(async (filePath) => {
    const result = await parseCommandFile(filePath);
    return [filePath, result] as const;
  });

  const parsedResults = await Promise.all(parsePromises);

  for (const [filePath, result] of parsedResults) {
    results.set(filePath, result);
  }

  return results;
}