/**
 * Lazy-loading CLI template generator
 * Generates CLI code that uses dynamic imports for optimal performance
 */

import {
  generateMiddlewareExecution,
  generateMiddlewareWrapper,
  generateParseOptionsFunction,
} from './middleware-template.js';

function generateGlobalErrorHandler(options: LazyCliOptions): string {
  if (!options.hasGlobalError || !options.globalErrorPath) {
    return `// Default error handler
async function handleDefaultError(error) {
  console.error('Error:', error);
  process.exit(1);
}`;
  }

  const globalErrorImportPath = options.globalErrorPath.replace(/\.ts$/, '.js');

  return `// Error handler with global error fallback
async function handleDefaultError(error) {
  // Try global error handler first
  try {
    const globalErrorModule = await import('${globalErrorImportPath}');
    if (globalErrorModule.default && typeof globalErrorModule.default === 'function') {
      const baseContext = { args: process.argv.slice(2), env: process.env, command: process.argv.slice(2), options: {} };
      const errorHandler = globalErrorModule.default.length === 0 
        ? globalErrorModule.default() 
        : globalErrorModule.default(baseContext);
      if (typeof errorHandler === 'function') {
        await errorHandler(error);
        return; // Global error handler should handle process.exit
      }
    }
  } catch (e) {
    // Global error handler failed, fall back to default
    if (process.env.DEBUG) {
      console.error('Global error handler failed:', e);
    }
  }
  
  // Default error handling
  console.error('Error:', error);
  process.exit(1);
}`;
}

function generateShowVersionFunction(options: LazyCliOptions): string {
  if (!options.hasVersion || !options.versionPath) {
    return `// Show version
async function showVersion() {
  console.log('0.2.0');
}`;
  }

  const versionImportPath = options.versionPath.replace(/\\/g, '/');
  return `// Show version
async function showVersion() {
  try {
    const versionModule = await import('${versionImportPath}');
    if (versionModule.default && typeof versionModule.default === 'function') {
      const versionInfo = versionModule.default.length === 0 
        ? versionModule.default() 
        : versionModule.default({ args: process.argv.slice(2), env: process.env, command: process.argv.slice(2), options: {} });
      if (versionInfo && versionInfo.version) {
        console.log(versionInfo.version);
      } else {
        console.log('0.2.0');
      }
    } else {
      console.log('0.2.0');
    }
  } catch {
    // No version file, use default
    console.log('0.2.0');
  }
}`;
}

function generateEnvHandler(options: LazyCliOptions): string {
  if (!options.hasEnv || !options.envPath) {
    return `// Environment variables (raw process.env)
const env = process.env;`;
  }

  const envImportPath = options.envPath.replace(/\\/g, '/');
  return `// Load and validate environment variables
let env = process.env;
try {
  const envModule = await import('${envImportPath}');
  if (envModule.default && typeof envModule.default === 'function') {
    const envHandler = envModule.default.length === 0 
      ? envModule.default() 
      : envModule.default({ args: process.argv.slice(2), env: process.env, command: process.argv.slice(2), options: {} });
    // TODO: Apply validation based on envHandler schema
    // For now, just use process.env directly
    env = process.env;
  }
} catch (e) {
  if (process.env.DEBUG) {
    console.error('Failed to load env.ts:', e);
  }
}`;
}

export interface LazyCliOptions {
  commands: CommandInfo[];
  hasParams: boolean;
  hasHelp: boolean;
  hasError: boolean;
  hasMiddleware?: boolean;
  middlewarePath?: string;
  hasGlobalError?: boolean;
  globalErrorPath?: string;
  hasEnv?: boolean;
  envPath?: string;
  hasVersion?: boolean;
  versionPath?: string;
}

export interface CommandInfo {
  name: string;
  path: string;
  hasParams: boolean;
  aliases?: string[];
}

export function generateLazyCLI(options: LazyCliOptions): string {
  return `#!/usr/bin/env node

/**
 * Auto-generated CLI with lazy loading
 * Only loads the code needed for the requested command
 */

// Minimal startup - just parse arguments
const args = process.argv.slice(2);

${generateEnvHandler(options)}

// Performance tracking (optional)
const startTime = performance.now();

// Command routing with lazy loading
async function execute() {
  try {
    // Parse command and subcommands
    const { commandPath, commandArgs } = parseCommand(args);
    ${generateMiddlewareWrapper(options.hasMiddleware || false, options.middlewarePath)}
    switch (commandPath) {
${generateCommandCases(options.commands)}
      case '--help':
      case '-h':
        await showDefaultHelp();
        break;
      case '--version':
      case '-v':
        await showVersion();
        break;
      default:
        console.error(\`Unknown command: \${commandPath}\`);
        console.error('Use --help to see available commands');
        process.exit(1);
    }${generateMiddlewareExecution(options.hasMiddleware || false, options.middlewarePath)}
  } catch (error) {
    handleDefaultError(error);
  }
}

${generateHelperFunctions(options)}

// Execute with performance monitoring
execute().then(() => {
  if (process.env.DECOPIN_PERF) {
    console.log(\`\\nExecution time: \${(performance.now() - startTime).toFixed(2)}ms\`);
  }
}).catch(err => {
  handleDefaultError(err);
});
`;
}

function generateCommandCases(commands: CommandInfo[]): string {
  const cases: string[] = [];

  // Generate cases for actual commands
  commands.forEach((cmd) => {
    const caseName = cmd.name === 'root' ? 'default' : cmd.name;
    cases.push(`      case '${caseName}':
        await executeCommand('${cmd.path}', commandArgs);
        break;`);

    // Generate cases for aliases
    if (cmd.aliases && cmd.aliases.length > 0) {
      cmd.aliases.forEach((alias) => {
        // For nested commands, we need to replace the last part with the alias
        let aliasCase: string;
        if (cmd.name.includes('/')) {
          const parts = cmd.name.split('/');
          parts[parts.length - 1] = alias;
          aliasCase = parts.join('/');
        } else {
          aliasCase = alias;
        }

        cases.push(`      case '${aliasCase}':
        await executeCommand('${cmd.path}', commandArgs);
        break;`);
      });
    }
  });

  return cases.join('\n');
}

function generateHelperFunctions(options: LazyCliOptions): string {
  return `
// Parse command and subcommands from arguments
function parseCommand(args) {
  if (args.length === 0) {
    return { commandPath: '--help', commandArgs: [] };
  }
  
  if (args[0].startsWith('-')) {
    return { commandPath: args[0], commandArgs: args.slice(1) };
  }
  
  // Check if this could be a nested command
  const commandList = [];
  ${options.commands
    .map((cmd) => {
      const names = [cmd.name];
      if (cmd.aliases) {
        cmd.aliases.forEach((alias) => {
          if (cmd.name.includes('/')) {
            const parts = cmd.name.split('/');
            parts[parts.length - 1] = alias;
            names.push(parts.join('/'));
          } else {
            names.push(alias);
          }
        });
      }
      return names.map((n) => `commandList.push('${n}');`).join('\n  ');
    })
    .join('\n  ')}
  
  let bestMatch = '';
  let bestMatchLength = 0;
  
  // Build potential command paths and find the longest match
  let currentPath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-')) break;
    
    currentPath = i === 0 ? args[i] : currentPath + '/' + args[i];
    if (commandList.includes(currentPath)) {
      bestMatch = currentPath;
      bestMatchLength = i + 1;
    }
  }
  
  if (bestMatch) {
    return {
      commandPath: bestMatch,
      commandArgs: args.slice(bestMatchLength)
    };
  }
  
  // No match found, check if the first arg might be a command
  if (commandList.includes(args[0])) {
    return {
      commandPath: args[0],
      commandArgs: args.slice(1)
    };
  }
  
  // Check if unknown command with --help
  if (args.length > 1 && (args[1] === '--help' || args[1] === '-h')) {
    return {
      commandPath: '--help',
      commandArgs: []
    };
  }
  
  // For unknown commands, build the full path tried
  let unknownPath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-')) break;
    unknownPath = i === 0 ? args[i] : unknownPath + ' ' + args[i];
  }
  
  return { 
    commandPath: unknownPath, 
    commandArgs: args.slice(unknownPath.split(' ').length) 
  };
}

// Execute a command with lazy loading
async function executeCommand(modulePath, args) {
  // Check for command-specific help
  if (args.includes('--help') || args.includes('-h')) {
    await showCommandHelp(modulePath);
    return;
  }
  
  const module = await import(modulePath);
  const handler = module.default;
  
  if (typeof handler !== 'function') {
    throw new Error(\`Invalid command module: \${modulePath}\`);
  }

  ${
    options.hasParams
      ? `
  // Load params if needed
  const paramsPath = modulePath.replace('/command.js', '/params.js');
  try {
    const paramsModule = await import(paramsPath);
    const createParams = paramsModule.default;
    const baseContext = { args, env: process.env, command: args, options: {} };
    const paramsHandler = typeof createParams === 'function' 
      ? (createParams.length === 0 ? createParams() : createParams(baseContext))
      : createParams;
    const params = await validateParams(args, paramsHandler);
    // Call handler with or without context based on function length
    if (handler.length === 0) {
      await handler();
    } else {
      await handler({ validatedData: params, args, env: process.env, command: args, options: {} });
    }
  } catch (e) {
    // Check if this is a validation error or missing params file
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      // No params file, execute without validation
      if (process.env.DEBUG) {
        console.error('No params file found, running without validation');
      }
      // Call handler with or without context based on function length
      if (handler.length === 0) {
        await handler();
      } else {
        await handler({ validatedData: {}, args, env: process.env, command: args, options: {} });
      }
    } else {
      // Validation error or other error
      if (e.issues) {
        // Valibot validation error - check for custom error handler
        const errorPath = modulePath.replace('/command.js', '/error.js');
        try {
          const errorModule = await import(errorPath);
          if (errorModule.default && typeof errorModule.default === 'function') {
            const errorHandler = errorModule.default;
            const errorContext = { validatedData: {}, args, env: process.env, command: args, options: {}, error: e };
            // Call error handler with or without context based on function length
            if (errorHandler.length === 0) {
              await errorHandler();
            } else if (errorHandler.length === 1 && !errorContext.validatedData) {
              // If handler expects only error parameter
              await errorHandler(e);
            } else {
              await errorHandler(errorContext);
            }
            return; // Error handler should handle process.exit
          }
        } catch {
          // No custom error handler, use global error handler
          await handleDefaultError(e);
          return;
        }
      } else {
        // Other error
        throw e;
      }
    }
  }`
      : `
  // Execute without params validation
  await handler({ validatedData: {}, args, env: process.env, command: args, options: {} });`
  }
}

${
  options.hasParams
    ? `
// Validate parameters lazily
async function validateParams(args, paramsHandler) {
  if (!paramsHandler) {
    return args;
  }
  
  const [positionalArgs, options] = parseArgs(args);
  
  // Handle based on which property exists
  if (paramsHandler.schema) {
    // Schema-based validation - no mappings, just validate raw args
    const validator = await getValidator(paramsHandler.schema);
    // For schema mode, pass the parsed arguments directly
    const data = { ...options };
    positionalArgs.forEach((arg, index) => {
      data[\`arg\${index}\`] = arg;
    });
    const result = await validator.parseAsync(data);
    return result;
  } else if (paramsHandler.mappings) {
    // Mappings-based validation
    const data = {};
    
    // Extract values from arguments based on mappings
    for (const mapping of paramsHandler.mappings) {
      let value;
      
      // Get value from positional args
      if (mapping.argIndex !== undefined && positionalArgs[mapping.argIndex] !== undefined) {
        value = positionalArgs[mapping.argIndex];
      }
      // Get value from options
      else if (mapping.option && options[mapping.option] !== undefined) {
        value = options[mapping.option];
      }
      // Use default value
      else if (mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }
      
      if (value !== undefined) {
        data[mapping.field] = value;
      }
    }
    
    // Create schema from mappings
    const valibot = await import('valibot');
    const schema = await createSchemaFromMappings(paramsHandler.mappings, valibot);
    const validator = await getValidator(schema);
    const result = await validator.parseAsync(data);
    return result;
  }
  
  // Invalid ParamsHandler - neither schema nor mappings provided
  throw new Error('Invalid ParamsHandler: must provide either schema or mappings');
}

// Parse command line arguments
function parseArgs(args) {
  const positional = [];
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
    } else {
      positional.push(arg);
    }
  }
  
  return [positional, options];
}

// Create valibot schema from mappings
async function createSchemaFromMappings(mappings, valibot) {
  const shape = {};
  
  for (const mapping of mappings) {
    let fieldSchema;
    
    // Create basic type schema with coercion for CLI inputs
    switch (mapping.type) {
      case 'number':
        // Coerce string to number
        fieldSchema = valibot.pipe(
          valibot.union([valibot.string(), valibot.number()]),
          valibot.transform((input) => {
            if (typeof input === 'number') return input;
            const num = Number(input);
            if (isNaN(num)) {
              throw new Error(\`Invalid number: \${input}\`);
            }
            return num;
          })
        );
        break;
      case 'boolean':
        // Coerce string to boolean
        fieldSchema = valibot.pipe(
          valibot.union([valibot.string(), valibot.boolean()]),
          valibot.transform((input) => {
            if (typeof input === 'boolean') return input;
            return input === 'true' || input === '1' || input === 'yes';
          })
        );
        break;
      case 'array':
        // Parse comma-separated values
        fieldSchema = valibot.pipe(
          valibot.string(),
          valibot.transform((input) => input.split(',').map(s => s.trim()))
        );
        break;
      case 'object':
        // Parse JSON string
        fieldSchema = valibot.pipe(
          valibot.string(),
          valibot.transform((input) => {
            try {
              return JSON.parse(input);
            } catch {
              throw new Error(\`Invalid JSON: \${input}\`);
            }
          })
        );
        break;
      case 'string':
      default:
        fieldSchema = valibot.string();
        // Apply additional validation if specified
        if (mapping.validation === 'email') {
          fieldSchema = valibot.pipe(fieldSchema, valibot.email('Invalid email format'));
        } else if (mapping.validation === 'url') {
          fieldSchema = valibot.pipe(fieldSchema, valibot.url('Invalid URL format'));
        }
        break;
    }
    
    // Apply required/optional
    if (mapping.required === false || mapping.defaultValue !== undefined) {
      fieldSchema = valibot.optional(fieldSchema, mapping.defaultValue);
    }
    
    shape[mapping.field] = fieldSchema;
  }
  
  return valibot.object(shape);
}

// Get validator based on schema type
async function getValidator(schema) {
  // Detect and lazy load the appropriate validator
  if (schema._def) {
    // Zod schema
    return schema;
  } else if (schema.async || schema['~run']) {
    // Valibot schema - need to use parseAsync from valibot
    const valibot = await import('valibot');
    return {
      parseAsync: async (data) => valibot.parseAsync(schema, data)
    };
  } else {
    return { parseAsync: async (data) => data };
  }
}`
    : ''
}

// Default help message
async function showDefaultHelp() {
  // Try to load version info
  let versionInfo = null;
  try {
    const versionModule = await import('./app/version.js');
    if (versionModule.default && typeof versionModule.default === 'function') {
      versionInfo = versionModule.default.length === 0 
        ? versionModule.default() 
        : versionModule.default({ args: process.argv.slice(2), env: process.env, command: process.argv.slice(2), options: {} });
    }
  } catch {
    // No version file
  }
  
  if (versionInfo && versionInfo.metadata) {
    console.log(\`\${versionInfo.metadata.name} \${versionInfo.metadata.version}\`);
    if (versionInfo.metadata.description) {
      console.log(versionInfo.metadata.description);
    }
    console.log();
  }
  
  console.log('Usage: cli <command> [options]');
  console.log('\\nAvailable commands:');
  ${options.commands
    .map(
      (cmd) => `console.log('  ${cmd.name === 'root' ? 'default' : cmd.name}');`
    )
    .join('\n  ')}
  console.log('\\nOptions:');
  console.log('  --help, -h     Show help');
  console.log('  --version, -v  Show version');
  
  if (versionInfo && versionInfo.metadata && versionInfo.metadata.author) {
    console.log(\`\\nAuthor: \${versionInfo.metadata.author}\`);
  }
}

// Show command-specific help
async function showCommandHelp(modulePath) {
  const commandName = modulePath.replace('./app/', '').replace('/command.js', '');
  const helpPath = modulePath.replace('/command.js', '/help.js');
  const paramsPath = modulePath.replace('/command.js', '/params.js');
  
  let helpDisplayed = false;
  
  // Try to load help.ts
  try {
    const helpModule = await import(helpPath);
    if (helpModule.default && typeof helpModule.default === 'function') {
      const helpHandler = helpModule.default();
      if (helpHandler && typeof helpHandler === 'object') {
        // Display help from HelpHandler object
        console.log(\`Usage: cli \${commandName} [options]\`);
        if (helpHandler.description) {
          console.log(\`\\n\${helpHandler.description}\`);
        }
        helpDisplayed = true;
        
        // Show params info if available
        try {
          const paramsModule = await import(paramsPath);
          if (paramsModule.default && typeof paramsModule.default === 'function') {
            const paramsHandler = paramsModule.default.length === 0 
              ? paramsModule.default() 
              : paramsModule.default({ args: [], env: process.env, command: [], options: {} });
            if (paramsHandler.mappings && paramsHandler.mappings.length > 0) {
              console.log('\\nArguments:');
              paramsHandler.mappings.forEach(mapping => {
                const argNum = mapping.argIndex !== undefined ? \`[\${mapping.argIndex + 1}] \` : '';
                const option = mapping.option ? \` (or --\${mapping.option})\` : '';
                console.log(\`  \${argNum}\${mapping.field}\${option}\`);
              });
            }
          }
        } catch {
          // No params file
        }
        
        if (helpHandler.aliases && helpHandler.aliases.length > 0) {
          console.log(\`\\nAliases: \${helpHandler.aliases.join(', ')}\`);
        }
        if (helpHandler.examples && helpHandler.examples.length > 0) {
          console.log('\\nExamples:');
          helpHandler.examples.forEach(ex => console.log(\`  cli \${ex}\`));
        }
        if (helpHandler.additionalHelp) {
          console.log(\`\\n\${helpHandler.additionalHelp}\`);
        }
        return;
      }
    }
  } catch {
    // No help file
  }
  
  // If no help.ts or help wasn't displayed, show basic help with params
  if (!helpDisplayed) {
    console.log(\`Usage: cli \${commandName} [options]\`);
    
    // Try to show params info
    try {
      const paramsModule = await import(paramsPath);
      if (paramsModule.default && typeof paramsModule.default === 'function') {
        const paramsHandler = paramsModule.default.length === 0 
          ? paramsModule.default() 
          : paramsModule.default({ args: [], env: process.env, command: [], options: {} });
        if (paramsHandler.mappings && paramsHandler.mappings.length > 0) {
          console.log('\\nArguments:');
          paramsHandler.mappings.forEach(mapping => {
            const argNum = mapping.argIndex !== undefined ? \`[\${mapping.argIndex + 1}] \` : '';
            const option = mapping.option ? \` (or --\${mapping.option})\` : '';
            console.log(\`  \${argNum}\${mapping.field}\${option}\`);
          });
        }
      }
    } catch {
      // No params file
    }
  }
}

${generateShowVersionFunction(options)}

${generateParseOptionsFunction(options.hasMiddleware || false)}

${generateGlobalErrorHandler(options)}
`;
}
