import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import {
  HANDLER_REGISTRY,
  type HandlerDefinition,
} from '../types/handler-registry.js';
import type { CLIStructure } from './types.js';

export class Scanner {
  private handlerRegistry: Map<string, HandlerDefinition>;

  constructor(private appDir: string) {
    this.handlerRegistry = new Map(
      HANDLER_REGISTRY.map((h) => [h.fileName, h])
    );
  }

  async scan(): Promise<CLIStructure> {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map(),
    };

    if (!existsSync(this.appDir)) {
      return structure;
    }

    // Scan for global handlers
    for (const [fileName, definition] of this.handlerRegistry) {
      if (definition.scope === 'global') {
        const handlerPath = join(this.appDir, fileName);
        if (existsSync(handlerPath)) {
          structure.handlers.set(definition.name, {
            path: handlerPath,
            definition,
          });

          // Populate backward compatibility fields
          switch (definition.name) {
            case 'middleware':
              structure.middleware = { path: handlerPath };
              break;
            case 'global-error':
              structure.globalError = { path: handlerPath };
              break;
            case 'env':
              structure.env = { path: handlerPath };
              break;
            case 'version':
              structure.version = { path: handlerPath };
              break;
          }
        }
      }
    }

    // Scan directories for command handlers
    this.scanDirectory(this.appDir, structure);
    return structure;
  }

  private scanDirectory(dir: string, structure: CLIStructure, parentPath = '') {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (error) {
      console.warn(
        `Warning: Failed to read directory ${dir}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        const newParentPath = parentPath ? `${parentPath}/${entry}` : entry;
        this.scanDirectory(fullPath, structure, newParentPath);
      } else if (stat.isFile() && entry.endsWith('.ts')) {
        const relativePath = relative(this.appDir, fullPath);
        const commandPath =
          dirname(relativePath) === '.' ? '' : dirname(relativePath);

        // Check if this file is a handler
        const definition = this.handlerRegistry.get(entry);
        if (definition && definition.scope === 'command') {
          const key = parentPath
            ? `${parentPath}/${definition.name}`
            : definition.name;
          structure.handlers.set(key, {
            path: fullPath,
            definition,
            commandPath: parentPath,
          });
        }

        // Populate backward compatibility fields
        if (entry === 'command.ts') {
          structure.commands.push({
            path: fullPath,
            name: parentPath || 'root',
          });
        } else if (entry === 'params.ts') {
          structure.params.push({
            path: fullPath,
            commandPath,
          });
        } else if (entry === 'help.ts') {
          structure.help.push({
            path: fullPath,
            commandPath,
          });
        } else if (entry === 'error.ts') {
          structure.errors.push({
            path: fullPath,
            commandPath,
          });
        }
      }
    }
  }

  hasCommands(): boolean {
    const structure = this.scanSync();
    return structure.commands.length > 0;
  }

  private scanSync(): CLIStructure {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map(),
    };

    if (!existsSync(this.appDir)) {
      return structure;
    }

    // Scan for global handlers
    for (const [fileName, definition] of this.handlerRegistry) {
      if (definition.scope === 'global') {
        const handlerPath = join(this.appDir, fileName);
        if (existsSync(handlerPath)) {
          structure.handlers.set(definition.name, {
            path: handlerPath,
            definition,
          });

          // Populate backward compatibility fields
          switch (definition.name) {
            case 'middleware':
              structure.middleware = { path: handlerPath };
              break;
            case 'global-error':
              structure.globalError = { path: handlerPath };
              break;
            case 'env':
              structure.env = { path: handlerPath };
              break;
            case 'version':
              structure.version = { path: handlerPath };
              break;
          }
        }
      }
    }

    this.scanDirectory(this.appDir, structure);
    return structure;
  }
}
