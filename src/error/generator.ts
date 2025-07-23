import type { ErrorGenerator, ErrorDefinition } from './types.js';

export class ErrorGeneratorImpl implements ErrorGenerator {
  async generate(errorDefs: ErrorDefinition[]): Promise<string> {
    const errorHandlers: string[] = [];
    
    // Build error handlers map
    for (const error of errorDefs) {
      const key = error.commandPath || 'root';
      errorHandlers.push(`  '${key}': ${error.handler.trim()}`);
    }

    return `
// Generated error handlers
const errorHandlers = {
${errorHandlers.join(',\n')}
};

export function getErrorHandler(commandPath) {
  return errorHandlers[commandPath || 'root'] || defaultErrorHandler;
}

function defaultErrorHandler(error) {
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

export async function handleError(error, commandPath) {
  const handler = getErrorHandler(commandPath);
  await handler(error);
}
`;
  }

  createErrorHandler(commandPath: string): string {
    return `
export default async function errorHandler(error) {
  if (error instanceof Error) {
    console.error(\`Error in ${commandPath}:\`, error.message);
    if (process.env.DEBUG) {
      console.error('Stack:', error.stack);
    }
  } else {
    console.error(\`Error in ${commandPath}:\`, error);
  }
  process.exit(1);
}
`;
  }
}