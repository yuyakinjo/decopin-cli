/**
 * Handler scope definitions
 */
export type HandlerScope = 'global' | 'command';

/**
 * Execution order constants for handlers
 */
export enum EXECUTION_ORDER {
  GLOBAL_ERROR = 0, // Special: wraps everything
  ENV = 100, // Environment variables
  VERSION = 200, // Version information
  MIDDLEWARE = 300, // Global middleware
  HELP = 400, // Help messages
  PARAMS = 500, // Parameter definitions
  COMMAND = 1000, // Command implementation (fixed)
  ERROR = 1100, // Error handling
}

/**
 * Handler definition interface
 */
export interface HandlerDefinition {
  /** Handler name (e.g., 'env', 'command') */
  name: string;

  /** File name (e.g., 'env.ts') */
  fileName: string;

  /** Handler type name (e.g., 'EnvHandler') */
  handlerType: string;

  /** Context type name (e.g., 'EnvContext') */
  contextType: string;

  /** Execution order (lower numbers execute first) */
  executionOrder: number;

  /** Scope: 'global' for root-only, 'command' for each command */
  scope: HandlerScope;

  /** Whether this handler is required */
  required: boolean;

  /** Other handlers this handler depends on */
  dependencies?: string[];

  /** Description of the handler's purpose */
  description?: string;
}

/**
 * Handler registry array containing all handler definitions
 * Updated to reflect the new handler-based architecture
 */
export const HANDLER_REGISTRY: HandlerDefinition[] = [
  {
    name: 'global-error',
    fileName: 'global-error.ts',
    handlerType: 'GlobalErrorHandler',
    contextType: 'GlobalErrorContext',
    executionOrder: EXECUTION_ORDER.GLOBAL_ERROR,
    scope: 'global',
    required: false,
    description: 'Catches all errors throughout the CLI execution',
  },
  {
    name: 'env',
    fileName: 'env.ts',
    handlerType: 'EnvHandler',
    contextType: 'EnvContext',
    executionOrder: EXECUTION_ORDER.ENV,
    scope: 'global',
    required: false,
    description: 'Type-safe environment variable handling',
  },
  {
    name: 'version',
    fileName: 'version.ts',
    handlerType: 'VersionHandler',
    contextType: 'VersionContext',
    executionOrder: EXECUTION_ORDER.VERSION,
    scope: 'global',
    required: false,
    description: 'Version information for the CLI',
  },
  {
    name: 'middleware',
    fileName: 'middleware.ts',
    handlerType: 'MiddlewareHandler',
    contextType: 'MiddlewareContext',
    executionOrder: EXECUTION_ORDER.MIDDLEWARE,
    scope: 'global',
    required: false,
    description: 'Global middleware for cross-cutting concerns',
  },
  {
    name: 'help',
    fileName: 'help.ts',
    handlerType: 'HelpHandler',
    contextType: 'HelpContext',
    executionOrder: EXECUTION_ORDER.HELP,
    scope: 'command',
    required: false,
    description: 'Help messages and usage information',
  },
  {
    name: 'params',
    fileName: 'params.ts',
    handlerType: 'ParamsHandler',
    contextType: 'ParamsContext',
    executionOrder: EXECUTION_ORDER.PARAMS,
    scope: 'command',
    required: false,
    dependencies: ['env'],
    description: 'Parameter definitions and validation',
  },
  {
    name: 'command',
    fileName: 'command.ts',
    handlerType: 'CommandHandler',
    contextType: 'CommandContext', // Uses specific CommandContext
    executionOrder: EXECUTION_ORDER.COMMAND,
    scope: 'command',
    required: true,
    dependencies: ['params'],
    description: 'Main command implementation',
  },
  {
    name: 'error',
    fileName: 'error.ts',
    handlerType: 'ErrorHandler',
    contextType: 'ErrorContext',
    executionOrder: EXECUTION_ORDER.ERROR,
    scope: 'command',
    required: false,
    description: 'Command-specific error handling',
  },
];

/**
 * Map type for quick handler lookup by name
 */
export type HandlerRegistryMap = Map<string, HandlerDefinition>;

/**
 * Create a map from the handler registry for efficient lookup
 */
export function createHandlerRegistryMap(): HandlerRegistryMap {
  return new Map(HANDLER_REGISTRY.map((handler) => [handler.name, handler]));
}

/**
 * Get handlers filtered by scope
 */
export function getHandlersByScope(scope: HandlerScope): HandlerDefinition[] {
  return HANDLER_REGISTRY.filter((handler) => handler.scope === scope);
}

/**
 * Get handlers sorted by execution order
 */
export function getHandlersByExecutionOrder(): HandlerDefinition[] {
  return [...HANDLER_REGISTRY].sort(
    (a, b) => a.executionOrder - b.executionOrder
  );
}

/**
 * Validate handler dependencies
 */
export function validateHandlerDependencies(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const handlerNames = new Set(HANDLER_REGISTRY.map((h) => h.name));

  for (const handler of HANDLER_REGISTRY) {
    if (handler.dependencies) {
      for (const dep of handler.dependencies) {
        if (!handlerNames.has(dep)) {
          errors.push(
            `Handler '${handler.name}' depends on '${dep}' which does not exist`
          );
        }

        // Check circular dependencies
        const depHandler = HANDLER_REGISTRY.find((h) => h.name === dep);
        if (depHandler?.dependencies?.includes(handler.name)) {
          errors.push(
            `Circular dependency detected between '${handler.name}' and '${dep}'`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
