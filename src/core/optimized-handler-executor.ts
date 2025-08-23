import type { Context } from '../types/context.js';
import {
  getHandlersByExecutionOrder,
  HANDLER_REGISTRY,
  type HandlerDefinition,
  type HandlerScope,
} from '../types/handler-registry.js';

/**
 * Generic handler type for improved type safety
 */
type HandlerFunction = (
  context: Record<string, unknown>
) => Promise<unknown> | unknown;

/**
 * Handler information with deferred loading capabilities
 */
export interface DeferredHandler {
  definition: HandlerDefinition;
  loader: () => Promise<{ default: HandlerFunction } | HandlerFunction>;
  handler?: HandlerFunction | undefined; // Cached handler after loading
  commandPath?: string | undefined;
}

/**
 * Handler information with loaded module
 */
export interface LoadedHandler {
  definition: HandlerDefinition;
  handler: HandlerFunction;
  commandPath?: string;
}

/**
 * Optimized executor for handlers using lazy loading and caching
 */
export class OptimizedHandlerExecutor {
  private deferredHandlers = new Map<string, DeferredHandler>();
  private loadPromises = new Map<string, Promise<HandlerFunction>>();

  /**
   * Register a handler with deferred loading
   */
  registerDeferredHandler(
    name: string,
    definition: HandlerDefinition,
    loader: () => Promise<{ default: HandlerFunction } | HandlerFunction>,
    commandPath?: string
  ): void {
    this.deferredHandlers.set(name, {
      definition,
      loader,
      commandPath: commandPath || undefined,
    });
  }

  /**
   * Get handlers filtered by scope and sorted by execution order
   */
  getExecutionOrder(scope: HandlerScope | 'all' = 'all'): HandlerDefinition[] {
    if (scope === 'all') {
      return getHandlersByExecutionOrder();
    }

    return getHandlersByExecutionOrder().filter((h) => h.scope === scope);
  }

  /**
   * Preload handlers that are likely to be needed
   * This uses lazy loading to optimize loading patterns
   */
  async preloadCriticalHandlers(): Promise<void> {
    const criticalHandlers = ['env', 'middleware', 'global-error'];
    const preloadPromises = criticalHandlers
      .filter((name) => this.deferredHandlers.has(name))
      .map((name) => this.loadHandler(name));

    await Promise.all(preloadPromises);
  }

  /**
   * Load a handler with caching and deduplication
   */
  private async loadHandler(name: string): Promise<HandlerFunction> {
    const deferred = this.deferredHandlers.get(name);
    if (!deferred) {
      throw new Error(`Handler ${name} not found`);
    }

    // Return cached handler if already loaded
    if (deferred.handler) {
      return deferred.handler;
    }

    // Check if loading is already in progress
    if (this.loadPromises.has(name)) {
      return this.loadPromises.get(name)!;
    }

    // Start loading and cache the promise
    const loadPromise = deferred
      .loader()
      .then((moduleOrHandler) => {
        // Handle both ESM default exports and direct function exports
        const handler =
          typeof moduleOrHandler === 'function'
            ? moduleOrHandler
            : moduleOrHandler.default;

        deferred.handler = handler;
        this.loadPromises.delete(name); // Clean up after loading
        return handler;
      })
      .catch((error) => {
        this.loadPromises.delete(name); // Clean up on error
        throw error;
      });

    this.loadPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Validate that all dependencies are available
   */
  validateDependencies(availableHandlers: string[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const availableSet = new Set(availableHandlers);

    for (const handler of HANDLER_REGISTRY) {
      if (availableSet.has(handler.name) && handler.dependencies) {
        for (const dep of handler.dependencies) {
          if (!availableSet.has(dep)) {
            errors.push(
              `Handler '${handler.name}' depends on '${dep}' which is not available`
            );
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Build context by executing handlers in order with optimized loading
   */
  async buildContext(
    initialContext: Context<Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    let context: Record<string, unknown> = { ...initialContext };
    const executionOrder = this.getExecutionOrder();

    // Preload critical handlers in parallel
    await this.preloadCriticalHandlers();

    for (const handlerDef of executionOrder) {
      const deferred = this.deferredHandlers.get(handlerDef.name);
      if (deferred) {
        const handler = await this.loadHandler(handlerDef.name);
        context = await this.executeHandler(handlerDef, handler, context);
      }
    }

    return context;
  }

  /**
   * Execute a single handler and update context
   */
  private async executeHandler(
    definition: HandlerDefinition,
    handler: HandlerFunction,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      switch (definition.name) {
        case 'env': {
          // EnvHandler returns validated environment
          const envResult = await handler(context);
          return { ...context, env: envResult };
        }

        case 'middleware': {
          // Middleware can modify context or perform side effects
          const middlewareResult = await handler(context);
          return (middlewareResult as Record<string, unknown>) || context;
        }

        case 'global-error': {
          // Global error handler is stored for later use
          return { ...context, globalErrorHandler: handler };
        }

        case 'version': {
          // Version handler typically adds version info
          const versionResult = await handler(context);
          return { ...context, version: versionResult };
        }

        case 'help': {
          // Help handler adds help information
          const helpResult = await handler(context);
          return { ...context, help: helpResult };
        }

        case 'params': {
          // Params handler validates and processes parameters
          const paramsResult = await handler(context);
          return { ...context, validatedData: paramsResult };
        }

        case 'error': {
          // Command-specific error handler
          return { ...context, errorHandler: handler };
        }

        case 'command': {
          // Command handler is the final execution step
          await handler(context);
          return context;
        }

        default:
          console.warn(`Unknown handler type: ${definition.name}`);
          return context;
      }
    } catch (error) {
      throw new Error(
        `Handler '${definition.name}' execution failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get performance metrics for loaded handlers
   */
  getPerformanceMetrics(): {
    totalHandlers: number;
    loadedHandlers: number;
    cachedHandlers: number;
    pendingLoads: number;
  } {
    const loaded = Array.from(this.deferredHandlers.values()).filter(
      (h) => h.handler !== undefined
    ).length;

    return {
      totalHandlers: this.deferredHandlers.size,
      loadedHandlers: loaded,
      cachedHandlers: loaded,
      pendingLoads: this.loadPromises.size,
    };
  }

  /**
   * Clear all cached handlers (useful for testing)
   */
  clearCache(): void {
    for (const deferred of this.deferredHandlers.values()) {
      deferred.handler = undefined;
    }
    this.loadPromises.clear();
  }
}

// Re-export original executor for compatibility
export { HandlerExecutor } from './handler-executor.js';
