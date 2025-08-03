/**
 * Command module - handles command.ts files
 * This module is lazy-loaded when commands need to be processed
 */

import type { CLIStructure, CommandFile } from '../core/types.js';
import type { CommandDefinition } from './types.js';

// Lazy-loaded parser module
let parserModule: typeof import('./parser.js') | null = null;
async function getParser() {
  if (!parserModule) {
    parserModule = await import('./parser.js');
  }
  return parserModule;
}

// Lazy-loaded generator module
let generatorModule: typeof import('./generator.js') | null = null;
async function getGenerator() {
  if (!generatorModule) {
    generatorModule = await import('./generator.js');
  }
  return generatorModule;
}

export async function parseCommands(
  files: CommandFile[]
): Promise<CommandDefinition[]> {
  // Parser module is initialized here
  const parser = await getParser();
  return parser.parseFiles(files);
}

export async function generateCommands(
  commands: CommandDefinition[],
  structure?: CLIStructure
): Promise<string> {
  // Generator module is initialized here
  const generator = await getGenerator();
  const result = await generator.generate(commands, structure);
  return result.content;
}

// Re-export types (no runtime cost)
export type {
  CommandDefinition,
  CommandHandler,
  CommandMetadata,
} from './types.js';
