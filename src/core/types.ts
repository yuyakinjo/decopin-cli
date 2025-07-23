/**
 * Core types used across all modules
 * These types are always loaded as they define the fundamental structures
 */

export interface ModuleBuilder<T> {
  parse(files: string[]): Promise<T[]>;
  generate(items: T[]): Promise<string>;
  validate?(items: T[]): ValidationResult;
}

export interface FileTypeModule {
  readonly filePattern: RegExp;
  readonly builder: ModuleBuilder<any>;
  readonly priority: number;
}

export interface CLIStructure {
  commands: CommandFile[];
  params: ParamsFile[];
  help: HelpFile[];
  errors: ErrorFile[];
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

export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

export interface BuildOptions {
  appDir: string;
  outDir: string;
  features?: {
    params?: boolean;
    help?: boolean;
    error?: boolean;
  };
}

// Generic file reference
export interface FileReference {
  path: string;
  content?: string;
}

// Add missing types for compatibility
export interface BuilderConfig {
  appDir: string;
  outputDir: string;
}

export interface CommandDefinition {
  name: string;
  path: string;
  metadata?: CommandMetadata;
  hasParams?: boolean;
  hasHelp?: boolean;
  hasError?: boolean;
}

export interface CommandMetadata {
  description?: string;
  aliases?: string[];
}

export interface ParamsDefinition {
  commandPath: string;
  schema: any;
  mappings: ParamMapping[];
}

export interface ParamMapping {
  field: string;
  argIndex?: number;
  option?: string;
  defaultValue?: any;
}