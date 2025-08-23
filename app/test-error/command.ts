import type { BaseCommandContext, ValidationError, ValidationIssue } from '../../dist/types/index.js';

// Create a custom ValidationError class that implements our interface
class CustomValidationError extends Error implements ValidationError {
  issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

// Create a custom ModuleError with proper typing
interface ModuleError extends Error {
  code: string;
}

export default async function createCommand(context: BaseCommandContext) {
  const errorType = context.args[0];

  if (errorType === 'validation') {
    // Simulate a validation error with proper type
    const error = new CustomValidationError('Validation failed', [
      { path: [{ key: 'name' }], message: 'Name is required' },
      { path: [{ key: 'email' }], message: 'Invalid email format' }
    ]);
    throw error;
  }

  if (errorType === 'module') {
    // Simulate a module error with proper typing
    const error = new Error('Cannot find module \'missing-module\'') as ModuleError;
    Object.assign(error, { code: 'ERR_MODULE_NOT_FOUND' });
    throw error;
  }

  if (errorType === 'runtime') {
    // Standard runtime error
    throw new Error('Something went wrong during execution');
  }

  console.log('Test command completed successfully');
}