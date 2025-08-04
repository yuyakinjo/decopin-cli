import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import {
  HANDLER_REGISTRY,
  type HandlerDefinition,
} from '../types/handler-registry.js';
import { OptimizedHandlerExecutor } from './optimized-handler-executor.js';
import type { CLIStructure } from './types.js';

/**
 * Optimized scanner with lazy loading and parallel processing
 */
export class OptimizedScanner {
  private handlerRegistry: Map<string, HandlerDefinition>;
  private executor: OptimizedHandlerExecutor;

  constructor(private appDir: string) {
    this.handlerRegistry = new Map(
      HANDLER_REGISTRY.map((h) => [h.fileName, h])
    );
    this.executor = new OptimizedHandlerExecutor();
  }

  /**
   * Scan with lazy loading and performance optimization
   */
  async scanOptimized(): Promise<CLIStructure> {
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

    // Scan for global handlers with lazy loading
    await this.scanGlobalHandlers(structure);

    // Scan directories for command handlers in parallel
    await this.scanDirectoryOptimized(this.appDir, structure);

    return structure;
  }

  /**
   * Scan global handlers with lazy loading registration
   */
  private async scanGlobalHandlers(structure: CLIStructure): Promise<void> {
    const globalHandlers = Array.from(this.handlerRegistry.entries()).filter(
      ([, definition]) => definition.scope === 'global'
    );

    const scanPromises = globalHandlers.map(async ([fileName, definition]) => {
      const handlerPath = join(this.appDir, fileName);
      if (existsSync(handlerPath)) {
        // Register with deferred loading
        this.executor.registerDeferredHandler(
          definition.name,
          definition,
          () => import(handlerPath)
        );

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
    });

    await Promise.all(scanPromises);
  }

  /**
   * Optimized directory scanning with parallel processing
   */
  private async scanDirectoryOptimized(
    dir: string,
    structure: CLIStructure,
    parentPath = ''
  ): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch (error) {
      console.warn(
        `Warning: Failed to read directory ${dir}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return;
    }

    // Process entries in parallel for better performance
    const processPromises = entries.map(async (entry) => {
      const fullPath = join(dir, entry);
      let fileStat: Awaited<ReturnType<typeof stat>>;

      try {
        fileStat = await stat(fullPath);
      } catch (error) {
        console.warn(`Warning: Failed to stat ${fullPath}:`, error);
        return;
      }

      if (fileStat.isDirectory()) {
        const newParentPath = parentPath ? `${parentPath}/${entry}` : entry;
        return this.scanDirectoryOptimized(fullPath, structure, newParentPath);
      } else if (fileStat.isFile() && entry.endsWith('.ts')) {
        return this.processTypeScriptFile(
          fullPath,
          entry,
          parentPath,
          structure
        );
      }
    });

    await Promise.all(processPromises);
  }

  /**
   * Process TypeScript files with lazy loading
   */
  private async processTypeScriptFile(
    fullPath: string,
    entry: string,
    parentPath: string,
    structure: CLIStructure
  ): Promise<void> {
    const relativePath = relative(this.appDir, fullPath);
    const commandPath =
      dirname(relativePath) === '.' ? '' : dirname(relativePath);

    // Check if this file is a handler
    const definition = this.handlerRegistry.get(entry);
    if (definition && definition.scope === 'command') {
      const key = parentPath
        ? `${parentPath}/${definition.name}`
        : definition.name;

      // Register with deferred loading
      this.executor.registerDeferredHandler(
        key,
        definition,
        () => import(fullPath),
        parentPath
      );

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

  /**
   * Get the optimized executor instance
   */
  getExecutor(): OptimizedHandlerExecutor {
    return this.executor;
  }

  /**
   * Get performance metrics from the scan
   */
  getPerformanceMetrics(): {
    totalHandlers: number;
    deferredHandlers: number;
    loadedHandlers: number;
  } {
    const executorMetrics = this.executor.getPerformanceMetrics();
    return {
      totalHandlers: this.handlerRegistry.size,
      deferredHandlers: executorMetrics.totalHandlers,
      loadedHandlers: executorMetrics.loadedHandlers,
    };
  }
}

// Export for backward compatibility
export { Scanner } from './scanner.js';
