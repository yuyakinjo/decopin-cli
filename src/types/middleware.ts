/**
 * Middleware context passed to middleware functions
 */
import type { Context } from './context.js';

export interface MiddlewareContext<
  Env extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
> {
  /** Command path (e.g., ['user', 'create']) */
  command: string[];
  /** Parsed command line arguments */
  args: string[];
  /** Parsed command line options */
  options: Record<string, string | boolean>;
  /** Environment variables */
  env: Env;
}

/**
 * Function to proceed to the next middleware or command
 */
export type NextFunction = () => Promise<void> | void;

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  context: MiddlewareContext,
  next: NextFunction
) => Promise<void> | void;

/**
 * Middleware factory function (exported from middleware.ts)
 */
export type MiddlewareFactory<E = typeof process.env> = 
  | ((context: Context<E>) => MiddlewareHandler)
  | (() => MiddlewareHandler);

/**
 * Middleware export structure
 */
export interface MiddlewareExport {
  default: MiddlewareFactory;
}
