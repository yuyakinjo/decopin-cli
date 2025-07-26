import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import type { CLIStructure } from './types.js';

export class Scanner {
  constructor(private appDir: string) {}

  async scan(): Promise<CLIStructure> {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: []
    };

    if (!existsSync(this.appDir)) {
      return structure;
    }

    // Check for middleware.ts in root
    const middlewarePath = join(this.appDir, 'middleware.ts');
    if (existsSync(middlewarePath)) {
      structure.middleware = {
        path: middlewarePath
      };
    }

    this.scanDirectory(this.appDir, structure);
    return structure;
  }

  private scanDirectory(dir: string, structure: CLIStructure, parentPath = '') {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        const newParentPath = parentPath ? `${parentPath}/${entry}` : entry;
        this.scanDirectory(fullPath, structure, newParentPath);
      } else if (stat.isFile() && entry.endsWith('.ts')) {
        const relativePath = relative(this.appDir, fullPath);
        const commandPath = dirname(relativePath) === '.' ? '' : dirname(relativePath);

        if (entry === 'command.ts') {
          structure.commands.push({
            path: fullPath,
            name: parentPath || 'root'
          });
        } else if (entry === 'params.ts') {
          structure.params.push({
            path: fullPath,
            commandPath
          });
        } else if (entry === 'help.ts') {
          structure.help.push({
            path: fullPath,
            commandPath
          });
        } else if (entry === 'error.ts') {
          structure.errors.push({
            path: fullPath,
            commandPath
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
      errors: []
    };

    if (!existsSync(this.appDir)) {
      return structure;
    }

    // Check for middleware.ts in root
    const middlewarePath = join(this.appDir, 'middleware.ts');
    if (existsSync(middlewarePath)) {
      structure.middleware = {
        path: middlewarePath
      };
    }

    this.scanDirectory(this.appDir, structure);
    return structure;
  }
}