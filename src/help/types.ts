import type { FileReference } from '../core/types.js';

export interface HelpDefinition {
  commandPath: string;
  name?: string;
  description?: string;
  usage?: string;
  examples?: string[];
  aliases?: string[];
  additionalHelp?: string;
}

export interface HelpModule {
  parseHelp: HelpParser['parse'];
  validateHelp: HelpValidator['validate'];
  generateHelp: HelpGenerator['generate'];
}

export interface HelpParser {
  parse(files: FileReference[]): Promise<HelpDefinition[]>;
}

export interface HelpValidator {
  validate(help: HelpDefinition): Promise<boolean>;
}

export interface HelpGenerator {
  generate(help: HelpDefinition[]): Promise<string>;
  createHelpCommand(commandPath: string): string;
}