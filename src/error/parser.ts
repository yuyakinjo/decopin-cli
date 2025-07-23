import type { ErrorParser, ErrorDefinition } from './types.js';
import type { FileReference } from '../core/types.js';
import { readFile } from 'node:fs/promises';
import * as ts from 'typescript';

export class ErrorParserImpl implements ErrorParser {
  async parse(files: FileReference[]): Promise<ErrorDefinition[]> {
    const definitions: ErrorDefinition[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file.path, 'utf-8');
        const parsed = this.parseErrorFile(content, file.path);
        
        if (parsed) {
          definitions.push({
            commandPath: this.getCommandPath(file.path),
            handler: parsed
          });
        }
      } catch (error) {
        console.error(`Failed to parse error file ${file.path}:`, error);
      }
    }

    return definitions;
  }

  private parseErrorFile(content: string, filePath: string): string | null {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let errorHandler: string | null = null;

    function visit(node: ts.Node) {
      // Look for default export function
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        if (ts.isFunctionExpression(node.expression) || 
            ts.isArrowFunction(node.expression)) {
          errorHandler = content.substring(node.pos, node.end);
        }
      }
      
      // Look for export default function declaration
      if (ts.isFunctionDeclaration(node) && 
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) &&
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
        errorHandler = content.substring(node.pos, node.end);
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return errorHandler;
  }

  private getCommandPath(filePath: string): string {
    // Extract command path from file path
    // e.g., "app/user/create/error.ts" -> "user/create"
    const match = filePath.match(/app\/(.*)\/error\.ts$/);
    if (!match) return '';
    
    const path = match[1];
    return path === '.' ? '' : path;
  }
}