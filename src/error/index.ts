export { ErrorParserImpl } from './parser.js';
export { ErrorGeneratorImpl } from './generator.js';
export { ErrorValidatorImpl } from './validator.js';
export type { ErrorParser, ErrorGenerator, ErrorValidator } from './types.js';

// Module builder
import type { ErrorModule, ErrorDefinition } from './types.js';
import { ErrorParserImpl } from './parser.js';
import { ErrorGeneratorImpl } from './generator.js';
import { ErrorValidatorImpl } from './validator.js';

export function createErrorModule(): ErrorModule {
  const parser = new ErrorParserImpl();
  const validator = new ErrorValidatorImpl();
  const generator = new ErrorGeneratorImpl();

  return {
    parseErrors: (files) => parser.parse(files),
    validateError: (error) => validator.validate(error),
    generateErrorHandlers: (errors) => generator.generate(errors)
  };
}

// Convenience exports
export async function parseErrors(files: Array<{ path: string; content: string }>): Promise<ErrorDefinition[]> {
  const module = createErrorModule();
  return module.parseErrors(files);
}

export async function generateErrorHandlers(errors: ErrorDefinition[]): Promise<string> {
  const module = createErrorModule();
  return module.generateErrorHandlers(errors);
}

// Runtime error handler
export async function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack:', error.stack);
    }
  } else {
    console.error('Error:', error);
  }
  process.exit(1);
}