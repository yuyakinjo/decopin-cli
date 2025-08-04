import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { CLIStructure } from './types.js';

export class Scanner {
  constructor(private appDir: string) {}

  async scan(): Promise<CLIStructure> {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
    };

    if (!existsSync(this.appDir)) {
      return structure;
    }

    // Check for middleware.ts in root
    const middlewarePath = join(this.appDir, 'middleware.ts');
    if (existsSync(middlewarePath)) {
      structure.middleware = {
        path: middlewarePath,
      };
    }

    // Check for global-error.ts in root
    const globalErrorPath = join(this.appDir, 'global-error.ts');
    if (existsSync(globalErrorPath)) {
      structure.globalError = {
        path: globalErrorPath,
      };
    }

    // Check for env.ts in root
    const envPath = join(this.appDir, 'env.ts');
    if (existsSync(envPath)) {
      structure.env = {
        path: envPath,
      };
    }

    // Check for version.ts in root
    const versionPath = join(this.appDir, 'version.ts');
    if (existsSync(versionPath)) {
      structure.version = {
        path: versionPath,
      };
    }

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
    };

    if (!existsSync(this.appDir)) {
      return structure;
    }

    // Check for middleware.ts in root
    const middlewarePath = join(this.appDir, 'middleware.ts');
    if (existsSync(middlewarePath)) {
      structure.middleware = {
        path: middlewarePath,
      };
    }

    // Check for global-error.ts in root
    const globalErrorPath = join(this.appDir, 'global-error.ts');
    if (existsSync(globalErrorPath)) {
      structure.globalError = {
        path: globalErrorPath,
      };
    }

    // Check for env.ts in root
    const envPath = join(this.appDir, 'env.ts');
    if (existsSync(envPath)) {
      structure.env = {
        path: envPath,
      };
    }

    // Check for version.ts in root
    const versionPath = join(this.appDir, 'version.ts');
    if (existsSync(versionPath)) {
      structure.version = {
        path: versionPath,
      };
    }

    this.scanDirectory(this.appDir, structure);
    return structure;
  }
}
