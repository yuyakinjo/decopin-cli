import * as ts from 'typescript';
import * as v from 'valibot';
import type {
  CommandDefinition,
  CommandMetadata,
  CommandSchema,
} from '../types/command.js';
import { parseObjectLiteral } from '../utils/ast-utils.js';

/**
 * ファイルからCommandDefinitionを抽出
 */
export function extractCommandDefinition(
  sourceFile: ts.SourceFile
): CommandDefinition | null {
  let commandDefinition: CommandDefinition | null = null;
  let hasHandler = false;
  let metadata: CommandMetadata | undefined;
  let schema: CommandSchema | undefined;

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
      // export default function() { ... } の形式（関数形式のcommandDefinition）
      else if (
        ts.isFunctionExpression(node.expression) ||
        ts.isArrowFunction(node.expression)
      ) {
        commandDefinition = {
          handler: async () => {}, // 実際の関数は動的にインポートで取得
        };
        hasHandler = true;
      }
      // export default function name() { ... } の形式（関数形式のcommandDefinition）
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
      // export default 関数呼び出し（関数形式のcommandDefinition）
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

    // export const metadata = { ... } の形式を探す
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
            declaration.name.text === 'metadata' &&
            declaration.initializer &&
            ts.isObjectLiteralExpression(declaration.initializer)
          ) {
            metadata = parseMetadata(declaration.initializer);
          }
          if (
            ts.isVariableDeclaration(declaration) &&
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === 'schema' &&
            declaration.initializer &&
            ts.isObjectLiteralExpression(declaration.initializer)
          ) {
            schema = parseSchema(declaration.initializer);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // メタデータとスキーマが個別にエクスポートされている場合は統合
  if (commandDefinition && (metadata || schema)) {
    if (metadata) {
      Object.assign(commandDefinition, { metadata });
    }
    if (schema) {
      Object.assign(commandDefinition, { schema });
    }
  }

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
        case 'metadata':
          if (ts.isObjectLiteralExpression(property.initializer)) {
            Object.assign(definition, {
              metadata: parseMetadata(property.initializer),
            });
          }
          break;
        case 'schema':
          if (ts.isObjectLiteralExpression(property.initializer)) {
            Object.assign(definition, {
              schema: parseSchema(property.initializer),
            });
          }
          break;
        case 'middleware':
          // middlewareは配列として解析
          definition.middleware = [];
          break;
      }
    }
  }

  return definition.handler ? (definition as CommandDefinition) : null;
}

/**
 * メタデータ解析用のスキーマ
 * Parse, Don't Validate: 不正な値は除外され、有効な値のみが残る
 */
const MetadataSchema = v.object({
  name: v.fallback(v.optional(v.string()), undefined),
  description: v.fallback(v.optional(v.string()), undefined),
  examples: v.fallback(v.optional(v.array(v.string())), undefined),
  aliases: v.fallback(v.optional(v.array(v.string())), undefined),
  additionalHelp: v.fallback(v.optional(v.string()), undefined),
});

/**
 * メタデータオブジェクトを解析
 * Parse, Don't Validate パターンを適用
 */
export function parseMetadata(
  objectLiteral: ts.ObjectLiteralExpression
): CommandMetadata {
  // parseObjectLiteralを使用して基本的な解析を行う
  const rawMetadata = parseObjectLiteral(objectLiteral);

  // valibotでパース - 無効な値は自動的に除外される
  const parseResult = v.safeParse(MetadataSchema, rawMetadata);

  if (parseResult.success) {
    // パース済みデータを直接返す（型安全）
    return parseResult.output as CommandMetadata;
  }

  // パースに失敗した場合も空のメタデータを返す
  return {};
}

/**
 * スキーマオブジェクトを解析
 */
export function parseSchema(
  objectLiteral: ts.ObjectLiteralExpression
): CommandSchema {
  const schema: Partial<CommandSchema> = {};

  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const key = property.name.text;

      switch (key) {
        case 'args':
          schema.args = {}; // 実際のスキーマは動的に処理
          break;
        case 'options':
          schema.options = {}; // 実際のスキーマは動的に処理
          break;
      }
    }
  }

  return schema as CommandSchema;
}
