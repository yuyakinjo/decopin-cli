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
  handler: any;
  commandPath?: string;
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
    initialContext: Context<any>,
    loadedHandlers: Map<string, LoadedHandler>
  ): Promise<any> {
    let context: any = { ...initialContext };
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
   * Execute a single handler and update context
   */
  private async executeHandler(
    definition: HandlerDefinition,
    loaded: LoadedHandler,
    context: any
  ): Promise<any> {
    try {
      switch (definition.name) {
        case 'env': {
          // EnvHandler returns validated environment
          const envResult = await loaded.handler(context);
          return { ...context, env: envResult };
        }

        case 'version': {
          // VersionHandler returns version info
          const versionResult = await loaded.handler(context);
          return { ...context, version: versionResult };
        }

        case 'middleware': {
          // Middleware is handled separately in the generator
          // Just mark it as available
          return { ...context, hasMiddleware: true };
        }

        case 'help': {
          // HelpHandler returns help information
          const helpResult = await loaded.handler(context);
          return { ...context, help: helpResult };
        }

        case 'params': {
          // ParamsHandler returns validation schema and mappings
          const paramsResult = await loaded.handler(context);
          return { ...context, params: paramsResult };
        }

        case 'command': {
          // Command execution is handled by the CLI runtime
          return context;
        }

        case 'error': {
          // Error handler is stored for later use
          return { ...context, errorHandler: loaded.handler };
        }

        case 'global-error': {
          // Global error handler is stored for later use
          return { ...context, globalErrorHandler: loaded.handler };
        }

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
