import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import * as ts from 'typescript';

/**
 * バージョン情報
 */
export interface VersionInfo {
  /** メインバージョン */
  version: string;
  /** 追加メタデータ */
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    [key: string]: unknown;
  };
}

/**
 * バージョンファイル解析結果
 */
export interface VersionParseResult {
  /** バージョン情報 */
  versionInfo: VersionInfo | null;
  /** 解析エラー */
  errors: string[];
  /** 解析警告 */
  warnings: string[];
}

/**
 * version.tsファイルが存在するかチェック
 */
export async function hasVersionFile(appDir: string): Promise<boolean> {
  try {
    const versionPath = join(appDir, 'version.ts');
    await stat(versionPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * TypeScript ASTからバージョン情報を抽出
 */
function extractVersionInfo(sourceFile: ts.SourceFile): VersionInfo | null {
  let versionInfo: VersionInfo | null = null;
  let version: string | null = null;
  let metadata: VersionInfo['metadata'] | null = null;

  function visit(node: ts.Node) {
    // export const version = "1.0.0" の形式
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isIdentifier(declaration.name)) {
        const varName = declaration.name.text;

        if (
          varName === 'version' &&
          declaration.initializer &&
          ts.isStringLiteral(declaration.initializer)
        ) {
          version = declaration.initializer.text;
        }

        if (
          varName === 'metadata' &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          metadata = parseObjectLiteral(declaration.initializer) as VersionInfo['metadata'];
        }
      }
    }

    // export default "1.0.0" の形式
    if (
      ts.isExportAssignment(node) &&
      !node.isExportEquals &&
      ts.isStringLiteral(node.expression)
    ) {
      if (!version) {
        version = node.expression.text;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (version) {
    versionInfo = {
      version,
      ...(metadata ? { metadata } : {}),
    };
  }

  return versionInfo;
}

/**
 * オブジェクトリテラルを解析
 */
function parseObjectLiteral(objectLiteral: ts.ObjectLiteralExpression): Record<string, unknown> {
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
 * リテラル値を抽出
 */
function extractLiteralValue(node: ts.Expression): unknown {
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
  if (ts.isObjectLiteralExpression(node)) {
    return parseObjectLiteral(node);
  }

  return undefined;
}

/**
 * version.tsファイルを解析
 */
export async function parseVersionFile(
  appDir: string
): Promise<VersionParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const versionPath = join(appDir, 'version.ts');

  try {
    // ファイルの存在確認
    if (!(await hasVersionFile(appDir))) {
      return {
        versionInfo: null,
        errors: [],
        warnings: ['version.ts file not found in app directory'],
      };
    }

    // ファイルを読み込み
    const sourceCode = await readFile(versionPath, 'utf-8');

    // TypeScript AST にパース
    const sourceFile = ts.createSourceFile(
      versionPath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // 構文エラーをチェック
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([versionPath], {})
    );
    for (const diagnostic of diagnostics) {
      if (diagnostic.messageText) {
        const message =
          typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : diagnostic.messageText.messageText;
        errors.push(message);
      }
    }

    // バージョン情報を抽出
    const versionInfo = extractVersionInfo(sourceFile);

    if (!versionInfo) {
      warnings.push('No version information found in version.ts');
    }

    return {
      versionInfo,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Failed to parse version.ts: ${error}`);
    return {
      versionInfo: null,
      errors,
      warnings,
    };
  }
}

/**
 * バージョン情報を取得（フォールバック付き）
 */
export async function getVersionInfo(
  appDir: string,
  fallbackVersion?: string
): Promise<VersionInfo> {
  const result = await parseVersionFile(appDir);

  if (result.versionInfo) {
    return result.versionInfo;
  }

  // フォールバック: package.jsonから取得
  return {
    version: fallbackVersion || '1.0.0',
    metadata: {
      description: 'CLI built with decopin-cli',
    },
  };
}
