/**
 * Lazy-loading CLI template generator
 * Generates CLI code that uses dynamic imports for optimal performance
 */

import type { CLIStructure } from '../core/types.js';
import {
  getHandlersByExecutionOrder,
  type HandlerDefinition,
} from '../types/handler-registry.js';
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

  const globalErrorImportPath = options.globalErrorPath;

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
  /** New: CLI structure with unified handler management */
  structure?: CLIStructure;
}

export interface CommandInfo {
  name: string;
  path: string;
  hasParams: boolean;
  aliases?: string[];
}

export function generateLazyCLI(options: LazyCliOptions): string {
  const useUnifiedHandlers = options.structure !== undefined;

  return `#!/usr/bin/env node

/**
 * Auto-generated CLI with lazy loading
 * Only loads the code needed for the requested command
 */

// Minimal startup - just parse arguments
const args = process.argv.slice(2);

${useUnifiedHandlers ? generateUnifiedGlobalHandlers(options) : ''}
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
${generateCommandCases(options.commands, options)}
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

// Simple command execution for backward compatibility
async function executeCommand(modulePath, args) {
  const commandModule = await import(modulePath);
  const handler = commandModule.default;

  if (typeof handler === 'function') {
    await handler({ args, env: process.env, options: parseOptions(args) });
  } else {
    console.error('Invalid command handler');
    process.exit(1);
  }
}

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

function generateCommandCases(
  commands: CommandInfo[],
  options: LazyCliOptions
): string {
  const cases: string[] = [];

  // Generate cases for actual commands
  commands.forEach((cmd) => {
    const caseName = cmd.name === 'root' ? 'default' : cmd.name;

    // Use unified handler execution if structure is provided
    let commandCode: string;
    if (options.structure) {
      commandCode = generateUnifiedCommandExecution(
        cmd.name === 'root' ? '' : cmd.name,
        options
      );
    } else {
      // Fallback to simple execution without structure
      const modulePath = cmd.path.replace(/\\/g, '/');
      commandCode = `        await executeCommand('${modulePath}', commandArgs);`;
    }

    cases.push(
      `      case '${caseName}': {\n${commandCode}\n        break;\n      }`
    );

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

        cases.push(
          `      case '${aliasCase}': {\n${commandCode}\n        break;\n      }`
        );
      });
    }
  });

  return cases.join('\n');
}

/**
 * Generate unified global handler initialization
 */
function generateUnifiedGlobalHandlers(options: LazyCliOptions): string {
  if (!options.structure) {
    // Fall back to old approach if no structure provided
    return '';
  }

  const globalHandlers = getHandlersByExecutionOrder()
    .filter((h) => h.scope === 'global')
    .filter((h) => options.structure!.handlers.has(h.name));

  if (globalHandlers.length === 0) {
    return '';
  }

  let code = '// Global handler initialization\n';
  code += 'const globalHandlers = {};\n\n';

  for (const handler of globalHandlers) {
    const handlerInfo = options.structure.handlers.get(handler.name);
    if (handlerInfo) {
      code += `// ${handler.description || handler.name}\n`;
      code += `try {\n`;
      const varName = handler.name.replace(/-/g, '_');
      // Convert absolute path to relative path from CLI location
      const importPath = handlerInfo.path.includes('/app/')
        ? `../examples/${handlerInfo.path.split('/app/')[1]}`
        : handlerInfo.path;
      code += `  const ${varName}Module = await import('${importPath.replace(/\\/g, '/').replace(/\.ts$/, '.js')}');\n`;
      code += `  globalHandlers['${handler.name}'] = ${varName}Module.default;\n`;
      code += `} catch (error) {\n`;
      code += `  // ${handler.name} is optional\n`;
      code += `  if (process.env.DEBUG) {\n`;
      code += `    console.warn('Failed to load ${handler.name}:', error.message);\n`;
      code += `  }\n`;
      code += `}\n\n`;
    }
  }

  return code;
}

/**
 * Generate unified command handler execution
 */
function generateUnifiedCommandExecution(
  commandPath: string,
  options: LazyCliOptions
): string {
  if (!options.structure) {
    // This should not be called without structure
    return '';
  }

  const commandHandlers = getHandlersByExecutionOrder().filter(
    (h) => h.scope === 'command'
  );

  let code = '';

  // Check which handlers exist for this command
  const availableHandlers: HandlerDefinition[] = [];
  const handlerPaths: Map<string, string> = new Map();

  for (const handler of commandHandlers) {
    const key = commandPath ? `${commandPath}/${handler.name}` : handler.name;
    if (options.structure.handlers.has(key)) {
      availableHandlers.push(handler);
      const handlerInfo = options.structure.handlers.get(key);
      if (handlerInfo) {
        handlerPaths.set(handler.name, handlerInfo.path);
      }
    }
  }

  // Import available handlers
  for (const handler of availableHandlers) {
    const path = handlerPaths.get(handler.name);
    if (path) {
      const varName = handler.name.replace(/-/g, '_');
      // Convert absolute path to relative path from CLI location
      const relativePath = path.includes('/app/')
        ? `../examples/${path.split('/app/')[1]}`
        : path;
      code += `        const ${varName}Module = await import('${relativePath.replace(/\\/g, '/').replace(/\.ts$/, '.js')}');\n`;
    }
  }

  code += `        const parsedOptions = parseOptions(commandArgs);\n`;

  // Build context progressively
  code += `        let context = {\n`;
  code += `          args: commandArgs,\n`;
  code += `          options: parsedOptions,\n`;
  code += `          env: env || process.env,\n`;
  code += `          command: '${commandPath}',\n`;
  code += `        };\n\n`;

  // Execute handlers in order
  let hasError = false;
  let hasHelp = false;
  let hasParams = false;
  let hasCommand = false;

  for (const handler of availableHandlers) {
    if (handler.name === 'error') hasError = true;
    if (handler.name === 'help') hasHelp = true;
    if (handler.name === 'params') hasParams = true;
    if (handler.name === 'command') hasCommand = true;
  }

  // Help handling
  if (hasHelp) {
    code += `        // Check for help flag\n`;
    code += `        if (commandArgs.includes('--help') || commandArgs.includes('-h')) {\n`;
    code += `          const helpHandler = helpModule.default;\n`;
    code += `          const helpInfo = typeof helpHandler === 'function' ? await helpHandler(context) : helpHandler;\n`;
    if (hasParams) {
      code += `          const paramsHandler = paramsModule.default;\n`;
      code += `          const paramsConfig = typeof paramsHandler === 'function' ? await paramsHandler(context) : paramsHandler;\n`;
      code += `          showUnifiedCommandHelp('${commandPath}', helpInfo, paramsConfig);\n`;
    } else {
      code += `          showUnifiedCommandHelp('${commandPath}', helpInfo);\n`;
    }
    code += `          return;\n`;
    code += `        }\n\n`;
  } else {
    // Even without help.ts, we should handle help flags
    code += `        // Check for help flag (no help.ts file)\n`;
    code += `        if (commandArgs.includes('--help') || commandArgs.includes('-h')) {\n`;
    // Convert to relative path - use .js extension for runtime
    const relativePath = `../examples/${commandPath}/command.js`;
    code += `          await showCommandHelp('${relativePath}');\n`;
    code += `          return;\n`;
    code += `        }\n\n`;
  }

  // Main execution with error handling
  if (hasError) {
    code += `        try {\n`;
  }

  // Params validation
  if (hasParams) {
    code += `        // Validate parameters\n`;
    code += `        const paramsHandler = paramsModule.default;\n`;
    code += `        const paramsConfig = typeof paramsHandler === 'function' ? await paramsHandler(context) : paramsHandler;\n`;
    code += `        const validatedData = await validateParams(commandArgs, paramsConfig);\n`;
    code += `        context.validatedData = validatedData;\n\n`;
  }

  // Command execution
  if (hasCommand) {
    code += `        // Execute command\n`;
    code += `        const commandHandler = commandModule.default;\n`;
    code += `        if (typeof commandHandler === 'function') {\n`;
    code += `          await commandHandler(context);\n`;
    code += `        } else {\n`;
    code += `          console.error('Invalid command handler');\n`;
    code += `          process.exit(1);\n`;
    code += `        }\n`;
  }

  if (hasError) {
    code += `        } catch (error) {\n`;
    code += `          const errorHandler = errorModule.default;\n`;
    code += `          if (typeof errorHandler === 'function') {\n`;
    code += `            await errorHandler({ ...context, error });\n`;
    code += `          } else {\n`;
    code += `            throw error;\n`;
    code += `          }\n`;
    code += `        }\n`;
  }

  return code;
}

function generateHelperFunctions(options: LazyCliOptions): string {
  return `

// Validate parameters against schema
async function validateParams(args, paramsConfig) {
  if (!paramsConfig) return {};

  // Handle mappings-based validation
  if (paramsConfig.mappings) {
    const result = {};
    const parsedOptions = parseOptions(args);

    // Filter out options and their values to get positional args
    const positionalArgs = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        // Skip this arg and potentially the next one if it's a value
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          i++; // Skip the value
        }
      } else if (arg.startsWith('-')) {
        // Skip single-dash options
      } else {
        positionalArgs.push(arg);
      }
    }

    for (const mapping of paramsConfig.mappings) {
      let value;

      // Get value from option first, then argIndex
      if (mapping.option && parsedOptions[mapping.option] !== undefined) {
        value = parsedOptions[mapping.option];
      } else if (mapping.argIndex !== undefined && positionalArgs[mapping.argIndex]) {
        value = positionalArgs[mapping.argIndex];
      } else if (mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      } else if (mapping.required) {
        const error = new Error('Validation failed');
        error.issues = [{
          path: [{ key: mapping.field }],
          message: \`Invalid key: Expected "\${mapping.field}" but received undefined\`
        }];
        throw error;
      }

      // Type conversion
      if (value !== undefined) {
        switch (mapping.type) {
          case 'number':
            value = Number(value);
            if (isNaN(value)) {
              const error = new Error('Validation failed');
              error.issues = [{
                path: [{ key: mapping.field }],
                message: \`Invalid number: Expected number but received "\${value}"\`
              }];
              throw error;
            }
            break;
          case 'boolean':
            value = value === 'true' || value === true;
            break;
          // string is default, no conversion needed
        }

        // Additional validation
        if (mapping.validation === 'email' && mapping.type === 'string') {
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailRegex.test(value)) {
            const error = new Error('Validation failed');
            error.issues = [{
              path: [{ key: mapping.field }],
              message: 'Invalid email format'
            }];
            throw error;
          }
        }

        result[mapping.field] = value;
      }
    }

    return result;
  }

  // Handle schema-based validation (valibot)
  if (paramsConfig.schema) {
    try {
      // Import valibot dynamically
      const { parse } = await import('valibot');
      const parsedArgs = {};
      const parsedOptions = parseOptions(args);

      // Merge positional args and options
      args.forEach((arg, index) => {
        if (!arg.startsWith('-')) {
          parsedArgs[\`arg\${index}\`] = arg;
        }
      });

      Object.assign(parsedArgs, parsedOptions);

      return parse(paramsConfig.schema, parsedArgs);
    } catch (error) {
      if (error.issues) {
        const messages = error.issues.map(issue => \`\${issue.path.join('.')}: \${issue.message}\`).join('\\n  ');
        throw new Error(\`Validation failed:\n  \${messages}\`);
      }
      throw error;
    }
  }

  return {};
}

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

// Default help message
async function showDefaultHelp() {
  // Try to load version info
  let versionInfo = null;
  try {
    const versionModule = await import('./version.js');
    if (versionModule.default && typeof versionModule.default === 'function') {
      versionInfo = versionModule.default.length === 0
        ? versionModule.default()
        : versionModule.default({ args: process.argv.slice(2), env: process.env, command: process.argv.slice(2), options: {} });
    }
  } catch (e) {
    // No version file
    if (process.env.DEBUG) {
      console.error('Failed to load version:', e);
    }
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

// Show unified command help with help info object
function showUnifiedCommandHelp(commandPath, helpInfo, paramsConfig) {
  console.log(\`Usage: cli \${commandPath} [options]\`);

  if (helpInfo && typeof helpInfo === 'object') {
    if (helpInfo.description) {
      console.log(\`\n\${helpInfo.description}\`);
    }

    // Show params info if available
    if (paramsConfig && paramsConfig.mappings && paramsConfig.mappings.length > 0) {
      console.log('\\nArguments:');
      paramsConfig.mappings.forEach(mapping => {
        const argNum = mapping.argIndex !== undefined ? \`[\${mapping.argIndex + 1}] \` : '';
        const option = mapping.option ? \` (or --\${mapping.option})\` : '';
        console.log(\`  \${argNum}\${mapping.field}\${option}\`);
      });
    }

    if (helpInfo.aliases && helpInfo.aliases.length > 0) {
      console.log(\`\nAliases: \${helpInfo.aliases.join(', ')}\`);
    }

    if (helpInfo.examples && helpInfo.examples.length > 0) {
      console.log('\\nExamples:');
      helpInfo.examples.forEach(ex => console.log(\`  cli \${ex}\`));
    }

    if (helpInfo.additionalHelp) {
      console.log(\`\n\${helpInfo.additionalHelp}\`);
    }
  }
}

// Show command-specific help
async function showCommandHelp(modulePath) {

const commandName = modulePath.replace('../examples/', '').replace('./examples/', '').replace('/command.ts', '').replace('/command.js', '');
const helpPath = modulePath.replace('/command.ts', '/help.js').replace('/command.js', '/help.js');
const paramsPath = modulePath.replace('/command.ts', '/params.js').replace('/command.js', '/params.js');

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
