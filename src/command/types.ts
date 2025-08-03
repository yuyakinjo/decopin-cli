import type { CommandContext } from '../types/context.js';

export interface CommandParser {
  parse(content: string, filePath: string): Promise<CommandDefinition>;
  validate(definition: CommandDefinition): ValidationResult;
}

export interface CommandGenerator {
  generate(commands: CommandDefinition[]): Promise<GeneratedCode>;
  createImports(commands: CommandDefinition[]): string[];
}

export interface CommandDefinition {
  name: string;
  path: string;
  description?: string;
  metadata?: CommandMetadata;
  hasParams: boolean;
  hasHelp: boolean;
  hasError: boolean;
}

export interface CommandMetadata {
  description?: string;
  version?: string;
  usage?: string;
  examples?: string[];
  aliases?: string[];
}

export interface GeneratedCode {
  content: string;
  imports: string[];
  types?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type CommandHandler<T = unknown> = (
  context: CommandContext<T>
) => Promise<void> | void;
