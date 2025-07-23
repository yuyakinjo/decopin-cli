/**
 * Params module - handles params.ts files
 * This module is lazy-loaded when parameter validation is needed
 */

import type { ParamsDefinition } from './types.js';
import type { ParamsFile } from '../core/types.js';

// Lazy-loaded modules
let parserModule: typeof import('./parser.js') | null = null;
let validatorModule: typeof import('./validator.js') | null = null;
let generatorModule: typeof import('./generator.js') | null = null;

async function getParser() {
  if (!parserModule) {
    parserModule = await import('./parser.js');
  }
  return parserModule;
}

async function getValidatorModule() {
  if (!validatorModule) {
    validatorModule = await import('./validator.js');
  }
  return validatorModule;
}

async function getGenerator() {
  if (!generatorModule) {
    generatorModule = await import('./generator.js');
  }
  return generatorModule;
}

export async function parseParams(files: ParamsFile[]): Promise<ParamsDefinition[]> {
  const parser = await getParser();
  return parser.parseFiles(files);
}

export async function generateValidators(params: ParamsDefinition[]): Promise<string> {
  const generator = await getGenerator();
  return generator.generate(params);
}

export async function getValidator(type: 'valibot' | 'zod' | 'manual') {
  const validator = await getValidatorModule();
  switch (type) {
    case 'valibot':
      return validator.createValibotValidator();
    case 'zod':
      return validator.createZodValidator();
    case 'manual':
      return validator.createManualValidator();
    default:
      throw new Error(`Unknown validation library: ${type}`);
  }
}

// Re-export types
export type { ParamsDefinition, SchemaDefinition, ValidationResult } from './types.js';