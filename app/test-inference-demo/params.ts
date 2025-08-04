import type { ParamsContext, ParamsHandler } from '../../dist/types/index.js';

// With context - full type inference
export default function createParams(context: ParamsContext<typeof process.env>): ParamsHandler {
  // TypeScript provides full IntelliSense for context properties:
  // - context.env: typeof process.env
  // - context.args: string[]
  // - context.options: Record<string, string | boolean>
  // - context.params: Record<string, string>
  // - context.showHelp: () => void
  
  const isDevelopment = context.env.NODE_ENV === 'development';
  const debugEnabled = context.options.debug === true;
  
  return {
    mappings: [
      {
        field: 'name',
        type: 'string',
        argIndex: 0,
        required: true,
        description: 'User name',
        defaultValue: isDevelopment ? 'dev-user' : 'prod-user'
      },
      {
        field: 'verbose',
        type: 'boolean',
        option: 'verbose',
        defaultValue: debugEnabled,
        description: 'Enable verbose output'
      }
    ]
  };
}