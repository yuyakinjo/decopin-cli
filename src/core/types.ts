/**
 * Core types used across all modules
 * These types are always loaded as they define the fundamental structures
 */

export interface CLIStructure {
  commands: CommandFile[];
  params: ParamsFile[];
  help: HelpFile[];
  errors: ErrorFile[];
  middleware?: MiddlewareFile;
  globalError?: GlobalErrorFile;
  env?: EnvFile;
  version?: VersionFile;
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
