import type { BaseCommandContext } from '../../dist/types/index.js';

export default async function createCommand(context: BaseCommandContext) {
  const errorType = context.args[0];
  
  if (errorType === 'validation') {
    // Simulate a validation error
    const error = new Error('Validation failed') as any;
    error.issues = [
      { path: [{ key: 'name' }], message: 'Name is required' },
      { path: [{ key: 'email' }], message: 'Invalid email format' }
    ];
    throw error;
  }
  
  if (errorType === 'module') {
    // Simulate a module error
    const error = new Error('Cannot find module \'missing-module\'');
    (error as any).code = 'ERR_MODULE_NOT_FOUND';
    throw error;
  }
  
  if (errorType === 'runtime') {
    // Standard runtime error
    throw new Error('Something went wrong during execution');
  }
  
  console.log('Test command completed successfully');
}