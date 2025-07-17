import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import * as ts from 'typescript';
import {
  findVariableDeclaration,
  isExportDefaultAssignment,
  isExportedVariableStatement,
  parseObjectLiteral,
} from '../utils/ast-utils.js';

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
  let version: string | null = null;
  let metadata: VersionInfo['metadata'] | null = null;

  function visit(node: ts.Node) {
    // export const version = "1.0.0" の形式
    if (isExportedVariableStatement(node)) {
      const versionDeclaration = findVariableDeclaration(node, 'version');
      if (
        versionDeclaration?.initializer &&
        ts.isStringLiteral(versionDeclaration.initializer)
      ) {
        version = versionDeclaration.initializer.text;
      }

      const metadataDeclaration = findVariableDeclaration(node, 'metadata');
      if (
        metadataDeclaration?.initializer &&
        ts.isObjectLiteralExpression(metadataDeclaration.initializer)
      ) {
        metadata = parseObjectLiteral(
          metadataDeclaration.initializer
        ) as VersionInfo['metadata'];
      }
    }

    // export default "1.0.0" の形式
    if (
      isExportDefaultAssignment(node) &&
      ts.isStringLiteral(node.expression) &&
      !version
    ) {
      version = node.expression.text;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return version
    ? {
        version,
        ...(metadata ? { metadata } : {}),
      }
    : null;
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
    if (!(await hasVersionFile(appDir))) {
      return {
        versionInfo: null,
        errors: [],
        warnings: ['version.ts file not found in app directory'],
      };
    }

    const sourceCode = await readFile(versionPath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      versionPath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

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

  return {
    version: fallbackVersion || '1.0.0',
    metadata: {
      description: 'CLI built with decopin-cli',
    },
  };
}
