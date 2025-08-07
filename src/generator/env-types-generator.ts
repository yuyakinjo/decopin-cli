#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

/**
 * env.tsファイルから環境変数の型定義を自動生成する
 */
export function generateEnvTypes(
  envFilePath: string,
  outputPath: string
): void {
  // env.tsファイルを読み込む
  const sourceCode = fs.readFileSync(envFilePath, 'utf-8');

  // TypeScript ASTを生成
  const sourceFile = ts.createSourceFile(
    envFilePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  let envSchema: Record<string, { type: string }> | null = null;

  // AST を走査してenvSchemaを見つける
  function visit(node: ts.Node) {
    // const envSchema = { ... } を探す
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length > 0
    ) {
      const declaration = node.declarationList.declarations[0];
      if (
        ts.isVariableDeclaration(declaration) &&
        declaration.name.getText() === 'envSchema' &&
        declaration.initializer
      ) {
        // as const の場合は AsExpression の expression を取得
        let initializer = declaration.initializer;
        if (ts.isAsExpression(initializer)) {
          initializer = initializer.expression;
        }

        if (ts.isObjectLiteralExpression(initializer)) {
          envSchema = parseEnvSchema(initializer);
        }
      }
    }

    // createEnv関数のreturn文を探す（export default functionの形式にも対応）
    if (
      (ts.isFunctionDeclaration(node) &&
        node.name?.getText() === 'createEnv') ||
      (ts.isFunctionDeclaration(node) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))
    ) {
      node.body?.statements.forEach((statement) => {
        if (
          ts.isReturnStatement(statement) &&
          statement.expression &&
          ts.isObjectLiteralExpression(statement.expression)
        ) {
          envSchema = parseEnvSchema(statement.expression);
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  // envSchemaオブジェクトをパース
  function parseEnvSchema(
    objectLiteral: ts.ObjectLiteralExpression
  ): Record<string, { type: string }> {
    const schema: Record<string, { type: string }> = {};

    objectLiteral.properties.forEach((prop) => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const propName = prop.name.text;

        // typeフィールドを探す
        if (ts.isObjectLiteralExpression(prop.initializer)) {
          prop.initializer.properties.forEach((innerProp) => {
            if (
              ts.isPropertyAssignment(innerProp) &&
              ts.isIdentifier(innerProp.name) &&
              innerProp.name.text === 'type'
            ) {
              let typeValue = '';

              // SCHEMA_TYPE.STRING のような形式を処理
              if (ts.isPropertyAccessExpression(innerProp.initializer)) {
                const propAccess =
                  innerProp.initializer as ts.PropertyAccessExpression;
                if (propAccess.name.text === 'STRING') {
                  typeValue = 'string';
                } else if (propAccess.name.text === 'NUMBER') {
                  typeValue = 'number';
                } else if (propAccess.name.text === 'BOOLEAN') {
                  typeValue = 'boolean';
                }
              }
              // 直接文字列リテラルの場合
              else if (ts.isStringLiteral(innerProp.initializer)) {
                typeValue = innerProp.initializer.text;
              }

              if (typeValue) {
                schema[propName] = { type: typeValue };
              }
            }
          });
        }
      }
    });

    return schema;
  }

  visit(sourceFile);

  if (!envSchema) {
    throw new Error('envSchema not found in env.ts');
  }

  // TypeScript型定義を生成
  const typeDefinition = generateTypeDefinition(envSchema);

  // 出力ディレクトリを作成
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ファイルに書き込む
  fs.writeFileSync(outputPath, typeDefinition, 'utf-8');
  console.log(`✅ Generated environment types at ${outputPath}`);
}

function generateTypeDefinition(
  schema: Record<string, { type: string }>
): string {
  const fields = Object.entries(schema)
    .map(([key, value]) => {
      const tsType =
        value.type === 'string'
          ? 'string'
          : value.type === 'number'
            ? 'number'
            : value.type === 'boolean'
              ? 'boolean'
              : 'unknown';
      return `  ${key}: ${tsType};`;
    })
    .join('\n');

  return `// This file is auto-generated. Do not edit manually.
// Generated from app/env.ts

export interface AppEnv {
${fields}
}
`;
}

// CLIとして実行された場合（ES modules対応）
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: generate-env-types <env-file-path> <output-path>');
    process.exit(1);
  }

  try {
    generateEnvTypes(args[0], args[1]);
  } catch (error) {
    console.error('Error generating env types:', error);
    process.exit(1);
  }
}
