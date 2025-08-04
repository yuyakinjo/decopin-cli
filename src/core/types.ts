/**
 * Core types used across all modules
 * These types are always loaded as they define the fundamental structures
 */

import type { HandlerDefinition } from '../types/handler-registry.js';

/**
 * Handler information discovered by scanner
 */
export interface HandlerInfo {
  path: string;
  definition: HandlerDefinition;
  commandPath?: string;
  content?: string;
}

export interface CLIStructure {
  commands: CommandFile[];
  params: ParamsFile[];
  help: HelpFile[];
  errors: ErrorFile[];
  middleware?: MiddlewareFile;
  globalError?: GlobalErrorFile;
  env?: EnvFile;
  version?: VersionFile;
  /**
   * New unified handler management
   * Key format:
   * - Global handlers: handler name (e.g., 'env', 'middleware')
   * - Command handlers: 'commandPath/handlerName' (e.g., 'user/create/params')
   */
  handlers: Map<string, HandlerInfo>;
}

export interface CommandFile {
  path: string;
  name: string;
  content?: string;
}

export interface ParamsFile {
  path: string;
  commandPath: string;
  content?: string;
}

export interface HelpFile {
  path: string;
  commandPath: string;
  content?: string;
}

export interface ErrorFile {
  path: string;
  commandPath: string;
  content?: string;
}

export interface MiddlewareFile {
  path: string;
  content?: string;
}

export interface GlobalErrorFile {
  path: string;
  content?: string;
}

export interface EnvFile {
  path: string;
  content?: string;
}

export interface VersionFile {
  path: string;
  content?: string;
}
