/**
 * Middleware integration template for CLI generation
 */

export function generateMiddlewareWrapper(
  hasMiddleware: boolean,
  middlewarePath?: string
): string {
  if (!hasMiddleware || !middlewarePath) {
    return '';
  }

  return `
    // Execute middleware if present
    let middlewareNext = async () => {`;
}

export function generateMiddlewareExecution(
  hasMiddleware: boolean,
  middlewarePath?: string
): string {
  if (!hasMiddleware || !middlewarePath) {
    return '';
  }

  return `
    };
    
    // Load and execute middleware
    const middlewareModule = await import('${middlewarePath}');
    const createMiddleware = middlewareModule.default;
    if (typeof createMiddleware === 'function') {
      const baseContext = { args: commandArgs, env: process.env, command: commandPath.split('/'), options: parseOptions(commandArgs) };
      const middleware = createMiddleware.length === 0 
        ? createMiddleware() 
        : createMiddleware(baseContext);
      const context = {
        command: commandPath.split('/'),
        args: commandArgs,
        options: parseOptions(commandArgs),
        env: process.env
      };
      await middleware(context, middlewareNext);
    } else {
      await middlewareNext();
    }`;
}

export function generateParseOptionsFunction(hasMiddleware: boolean): string {
  if (!hasMiddleware) {
    return '';
  }

  return `
// Parse options from args for middleware
function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      options[key] = true;
    }
  }
  return options;
}`;
}
