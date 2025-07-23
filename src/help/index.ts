export { HelpParserImpl } from './parser.js';
export { HelpGeneratorImpl } from './generator.js';
export { HelpValidatorImpl } from './validator.js';
export type { HelpParser, HelpGenerator, HelpValidator } from './types.js';

// Module builder
import type { HelpModule, HelpDefinition } from './types.js';
import { HelpParserImpl } from './parser.js';
import { HelpGeneratorImpl } from './generator.js';
import { HelpValidatorImpl } from './validator.js';

export function createHelpModule(): HelpModule {
  const parser = new HelpParserImpl();
  const validator = new HelpValidatorImpl();
  const generator = new HelpGeneratorImpl();

  return {
    parseHelp: (files) => parser.parse(files),
    validateHelp: (help) => validator.validate(help),
    generateHelp: (help) => generator.generate(help)
  };
}

// Convenience exports
export async function parseHelp(files: Array<{ path: string; content: string }>): Promise<HelpDefinition[]> {
  const module = createHelpModule();
  return module.parseHelp(files);
}

export async function generateHelp(help: HelpDefinition[]): Promise<string> {
  const module = createHelpModule();
  return module.generateHelp(help);
}