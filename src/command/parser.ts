import { readFileSync } from 'fs';
import { dirname } from 'path';
import * as ts from 'typescript';
import type { CommandFile } from '../core/types.js';
import {
  isArrowFunctionNode,
  isCallExpressionNode,
  isDefaultExport,
  isExportedNode,
  isFunctionNode,
  isIdentifierNode,
  isObjectLiteralNode,
} from '../internal/guards/ast.js';
import type {
  CommandDefinition,
  CommandParser,
  ValidationResult,
} from './types.js';

export class CommandParserImpl implements CommandParser {
  async parse(content: string, filePath: string): Promise<CommandDefinition> {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const commandName = this.extractCommandName(filePath);
    const hasDefaultExport = this.hasDefaultExportFunction(sourceFile);

    if (!hasDefaultExport) {
      throw new Error(`No default export function found in ${filePath}`);
    }

    const description = this.extractDescription(sourceFile);
    const definition: CommandDefinition = {
      name: commandName,
      path: filePath,
      hasParams: false, // Will be updated by scanner
      hasHelp: false, // Will be updated by scanner
      hasError: false, // Will be updated by scanner
    };

    if (description) {
      definition.metadata = { description };
    }

    return definition;
  }

  validate(definition: CommandDefinition): ValidationResult {
    const errors: string[] = [];

    if (!definition.name) {
      errors.push('Command must have a name');
    }

    if (!definition.path) {
      errors.push('Command must have a path');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private hasDefaultExportFunction(sourceFile: ts.SourceFile): boolean {
    let hasHandler = false;

    function visit(node: ts.Node) {
      // export default { ... } の形式を探す
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        if (isObjectLiteralNode(node.expression)) {
          // オブジェクト形式
          hasHandler = true;
        }
        // export default function() { ... } の形式（関数形式のcommandHandler）
        else if (
          isFunctionNode(node.expression) ||
          isArrowFunctionNode(node.expression)
        ) {
          hasHandler = true;
        }
        // export default function name() { ... } の形式（関数形式のcommandHandler）
        else if (ts.isFunctionDeclaration(node.expression)) {
          hasHandler = true;
        }
        // export default identifier の形式（変数を参照）
        else if (isIdentifierNode(node.expression)) {
          hasHandler = true;
        }
        // export default 関数呼び出し（関数形式のcommandHandler）
        else if (isCallExpressionNode(node.expression)) {
          hasHandler = true;
        }
      }

      // export default function name() { ... } の形式（関数宣言）
      if (ts.isFunctionDeclaration(node)) {
        if (isExportedNode(node) && isDefaultExport(node)) {
          hasHandler = true;
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return hasHandler;
  }

  private extractCommandName(filePath: string): string {
    const dir = dirname(filePath);
    // Get the relative path from 'app' directory
    const appIndex = dir.indexOf('app');
    if (appIndex === -1) {
      return 'root';
    }

    const relativePath = dir.substring(appIndex + 4); // Skip 'app/'
    return relativePath || 'root';
  }

  private extractDescription(sourceFile: ts.SourceFile): string | undefined {
    // Extract from JSDoc comments
    const firstNode = sourceFile.statements[0];
    if (firstNode && ts.getJSDocCommentsAndTags(firstNode).length > 0) {
      const jsDoc = ts.getJSDocCommentsAndTags(firstNode)[0];
      if (jsDoc && ts.isJSDoc(jsDoc) && jsDoc.comment) {
        if (typeof jsDoc.comment === 'string') {
          return jsDoc.comment;
        } else if (Array.isArray(jsDoc.comment)) {
          return jsDoc.comment.map(c => c.text || '').join('');
        }
      }
    }
    return undefined;
  }
}

export async function parseFiles(
  files: CommandFile[]
): Promise<CommandDefinition[]> {
  const parser = new CommandParserImpl();
  const definitions: CommandDefinition[] = [];

  // 並列処理で高速化
  const parsePromises = files.map(async (file) => {
    const content = readFileSync(file.path, 'utf-8');
    return parser.parse(content, file.path);
  });

  const results = await Promise.all(parsePromises);
  definitions.push(...results);

  return definitions;
}
