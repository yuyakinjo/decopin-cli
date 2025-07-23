import { readFileSync } from 'fs';
import * as ts from 'typescript';
import { dirname } from 'path';
import type { ParamsDefinition, ParamsParser } from './types.js';
import type { ParamsFile } from '../core/types.js';
import {
  isDefaultExport,
  isExportedNode,
} from '../internal/guards/ast.js';

export class ParamsParserImpl implements ParamsParser {
  async parse(content: string, filePath: string): Promise<ParamsDefinition> {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const commandPath = this.extractCommandPath(filePath);
    const hasDefaultExport = this.hasDefaultExportFunction(sourceFile);

    if (!hasDefaultExport) {
      throw new Error(`No default export function found in ${filePath}`);
    }

    // For now, we'll mark as valibot by default
    // The actual detection happens at runtime
    return {
      commandPath,
      schema: {
        type: 'valibot',
        code: '', // Will be populated by generator
        imports: []
      },
      mappings: []
    };
  }

  extractSchema(definition: ParamsDefinition) {
    return definition.schema;
  }

  private hasDefaultExportFunction(sourceFile: ts.SourceFile): boolean {
    let hasHandler = false;

    function visit(node: ts.Node) {
      // export default function createParams() { ... }
      if (ts.isFunctionDeclaration(node)) {
        if (isExportedNode(node) && isDefaultExport(node)) {
          hasHandler = true;
        }
      }

      // export default createParams
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        hasHandler = true;
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return hasHandler;
  }

  private extractCommandPath(filePath: string): string {
    const dir = dirname(filePath);
    const parts = dir.split('/');
    // Remove 'app' from the beginning if present
    if (parts[0] === 'app') {
      parts.shift();
    }
    return parts.join('/') || '';
  }
}

export async function parseFiles(files: ParamsFile[]): Promise<ParamsDefinition[]> {
  const parser = new ParamsParserImpl();
  const definitions: ParamsDefinition[] = [];

  // 並列処理で高速化
  const parsePromises = files.map(async (file) => {
    const content = readFileSync(file.path, 'utf-8');
    return parser.parse(content, file.path);
  });

  const results = await Promise.all(parsePromises);
  definitions.push(...results);

  return definitions;
}