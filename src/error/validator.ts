import type { ErrorValidator, ErrorDefinition } from './types.js';

export class ErrorValidatorImpl implements ErrorValidator {
  async validate(error: ErrorDefinition): Promise<boolean> {
    // Basic validation rules
    if (!error.commandPath && error.commandPath !== '') {
      console.warn('Error definition missing commandPath');
      return false;
    }

    if (!error.handler || typeof error.handler !== 'string') {
      console.warn(`Error handler for ${error.commandPath} is invalid`);
      return false;
    }

    // Check if handler contains a valid function
    if (!error.handler.includes('function') && !error.handler.includes('=>')) {
      console.warn(`Error handler for ${error.commandPath} does not appear to be a function`);
      return false;
    }

    return true;
  }
}