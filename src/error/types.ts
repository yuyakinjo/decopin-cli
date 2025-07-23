import type { FileReference } from '../core/types.js';

export interface ErrorDefinition {
  commandPath: string;
  handler: string; // The error handler function code
}

export interface ErrorModule {
  parseErrors: ErrorParser['parse'];
  validateError: ErrorValidator['validate'];
  generateErrorHandlers: ErrorGenerator['generate'];
}

export interface ErrorParser {
  parse(files: FileReference[]): Promise<ErrorDefinition[]>;
}

export interface ErrorValidator {
  validate(error: ErrorDefinition): Promise<boolean>;
}

export interface ErrorGenerator {
  generate(errors: ErrorDefinition[]): Promise<string>;
  createErrorHandler(commandPath: string): string;
}