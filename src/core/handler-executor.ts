import type { GlobalErrorHandler } from '../handlers/global-error/types.js';
import type { HelpHandler } from '../handlers/help/types.js';
import type { ParamsHandler } from '../handlers/params/types.js';
import type { VersionHandler } from '../handlers/version/types.js';
import type { Context } from '../types/context.js';
import {
  createHandlerRegistryMap,
  getHandlersByExecutionOrder,
  HANDLER_REGISTRY,
  type HandlerDefinition,
  type HandlerRegistryMap,
  type HandlerScope,
} from '../types/handler-registry.js';

/**
 * Handler information with loaded module
 */
export interface LoadedHandler {
  definition: HandlerDefinition;
  handler: unknown;
  commandPath?: string;
}

/**
 * Extended context with handler results
 */
interface ExtendedContext extends Context<Record<string, unknown>> {
  version?: VersionHandler;
  hasMiddleware?: boolean;
  help?: HelpHandler;
  paramsHandler?: ParamsHandler;
  errorHandler?: (
    context: Context<Record<string, unknown>> & { error: unknown }
  ) => Promise<void> | void;
  globalErrorHandler?: GlobalErrorHandler;
}

/**
 * Executor for handlers based on the registry
 */
export class HandlerExecutor {
  private registry: HandlerRegistryMap;

  constructor() {
    this.registry = createHandlerRegistryMap();
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
   * Build context by executing handlers in order
   */
  async buildContext(
    initialContext: Context<Record<string, unknown>>,
    loadedHandlers: Map<string, LoadedHandler>
  ): Promise<ExtendedContext> {
    let context: ExtendedContext = { ...initialContext };
    const executionOrder = this.getExecutionOrder();

    for (const handlerDef of executionOrder) {
      const loaded = loadedHandlers.get(handlerDef.name);
      if (loaded) {
        context = await this.executeHandler(handlerDef, loaded, context);
      }
    }

    return context;
  }

  /**
   * Helper to execute a handler function with proper typing
   */
  private async executeHandlerFunction(
    handler: unknown,
    context: ExtendedContext
  ): Promise<unknown> {
    if (typeof handler !== 'function') {
      throw new Error('Handler is not a function');
    }

    // Check if handler expects context (has parameters)
    if (handler.length > 0) {
      return await handler(context);
    } else {
      // Handler doesn't expect context
      return await handler();
    }
  }

  /**
   * Execute a single handler and update context
   */
  private async executeHandler(
    definition: HandlerDefinition,
    loaded: LoadedHandler,
    context: ExtendedContext
  ): Promise<ExtendedContext> {
    try {
      const result = await this.executeHandlerFunction(loaded.handler, context);

      switch (definition.name) {
        case 'env':
          return { ...context, env: result as Record<string, unknown> };

        case 'version':
          return { ...context, version: result as VersionHandler };

        case 'middleware':
          // Middleware is handled separately in the generator
          return { ...context, hasMiddleware: true };

        case 'help':
          return { ...context, help: result as HelpHandler };

        case 'params':
          return { ...context, paramsHandler: result as ParamsHandler };

        case 'command':
          // Command execution is handled by the CLI runtime
          return context;

        case 'error': {
          // Error handler is stored for later use
          const errorHandler =
            loaded.handler as ExtendedContext['errorHandler'];
          return errorHandler ? { ...context, errorHandler } : context;
        }

        case 'global-error':
          // Global error handler is stored for later use
          return {
            ...context,
            globalErrorHandler: loaded.handler as GlobalErrorHandler,
          };

        default:
          // Unknown handler, skip
          console.warn(`Unknown handler type: ${definition.name}`);
          return context;
      }
    } catch (error) {
      throw new Error(
        `Failed to execute handler '${definition.name}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Check if a handler is required
   */
  isRequired(handlerName: string): boolean {
    const handler = this.registry.get(handlerName);
    return handler?.required ?? false;
  }

  /**
   * Get handler definition by name
   */
  getHandler(handlerName: string): HandlerDefinition | undefined {
    return this.registry.get(handlerName);
  }

  /**
   * Get all handler definitions
   */
  getAllHandlers(): HandlerDefinition[] {
    return HANDLER_REGISTRY;
  }
}
