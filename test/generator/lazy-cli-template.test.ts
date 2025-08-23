import { describe, it, expect } from 'bun:test';
import { generateLazyCLI, type LazyCliOptions, type CommandInfo } from '../../src/generator/lazy-cli-template.js';
import type { CLIStructure } from '../../src/core/types.js';
import { HANDLER_REGISTRY } from '../../src/types/handler-registry.js';

describe('Lazy CLI Template - Aliases', () => {
  it('should generate command cases with aliases', () => {
    const commands: CommandInfo[] = [
      {
        name: 'user/create',
        path: './app/user/create/command.js',
        hasParams: true,
        aliases: ['new', 'add']
      },
      {
        name: 'deploy',
        path: './app/deploy/command.js',
        hasParams: false,
        aliases: ['d', 'publish']
      }
    ];

    // Create a minimal structure for the test
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map([
        ['user/create/command', {
          path: './app/user/create/command.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'command')!,
          commandPath: 'user/create',
        }],
        ['deploy/command', {
          path: './app/deploy/command.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'command')!,
          commandPath: 'deploy',
        }],
      ]),
    };

    const options: LazyCliOptions = {
      commands,
      hasParams: true,
      hasHelp: false,
      hasError: false,
      structure,
    };

    const result = generateLazyCLI(options);

    // Check that aliases are generated
    expect(result).toContain("case 'user/new':");
    expect(result).toContain("case 'user/add':");
    expect(result).toContain("case 'd':");
    expect(result).toContain("case 'publish':");
    
    // Check alias command list generation
    expect(result).toContain("commandList.push('user/new');");
    expect(result).toContain("commandList.push('user/add');");
    expect(result).toContain("commandList.push('d');");
    expect(result).toContain("commandList.push('publish');");
  });

  it('should handle commands without aliases', () => {
    const commands: CommandInfo[] = [
      {
        name: 'test',
        path: './app/test/command.js',
        hasParams: false
      }
    ];

    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map([
        ['test/command', {
          path: './app/test/command.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'command')!,
          commandPath: 'test',
        }],
      ]),
    };

    const options: LazyCliOptions = {
      commands,
      hasParams: false,
      hasHelp: false,
      hasError: false,
      structure,
    };

    const result = generateLazyCLI(options);

    // Should not have any alias-related code for this command
    expect(result).toContain("case 'test':");
    expect(result).not.toContain("case 'd':");
  });

  it('should generate root command aliases correctly', () => {
    const commands: CommandInfo[] = [
      {
        name: 'root',
        path: './app/command.js',
        hasParams: true,
        aliases: ['main']
      }
    ];

    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map([
        ['command', {
          path: './app/command.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'command')!,
          commandPath: '',
        }],
      ]),
    };

    const options: LazyCliOptions = {
      commands,
      hasParams: true,
      hasHelp: false,
      hasError: false,
      structure,
    };

    const result = generateLazyCLI(options);

    // Root command should be 'default' case
    expect(result).toContain("case 'default':");
    expect(result).toContain("case 'main':");
  });
});

describe('Lazy CLI Template - Unified Handlers', () => {
  it('should generate unified handler execution when structure is provided', () => {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map([
        ['hello/command', {
          path: './app/hello/command.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'command')!,
          commandPath: 'hello',
        }],
        ['hello/params', {
          path: './app/hello/params.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'params')!,
          commandPath: 'hello',
        }],
        ['hello/help', {
          path: './app/hello/help.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'help')!,
          commandPath: 'hello',
        }],
      ]),
    };

    const commands: CommandInfo[] = [
      {
        name: 'hello',
        path: './app/hello/command.js',
        hasParams: true,
      }
    ];

    const options: LazyCliOptions = {
      commands,
      hasParams: true,
      hasHelp: true,
      hasError: false,
      structure,
    };

    const result = generateLazyCLI(options);

    // Check unified handler imports - paths are transformed to ../examples/
    expect(result).toContain("const commandModule = await import('../examples/hello/command.js');");
    expect(result).toContain("const paramsModule = await import('../examples/hello/params.js');");
    expect(result).toContain("const helpModule = await import('../examples/hello/help.js');");

    // Check context building
    expect(result).toContain("let context = {");
    expect(result).toContain("args: commandArgs,");
    expect(result).toContain("options: parsedOptions,");
    expect(result).toContain("env: env || process.env,");

    // Check help handling
    expect(result).toContain("if (commandArgs.includes('--help') || commandArgs.includes('-h'))");

    // Check params validation
    expect(result).toContain("const paramsHandler = paramsModule.default;");
    expect(result).toContain("const validatedData = await validateParams");

    // Check command execution
    expect(result).toContain("const commandHandler = commandModule.default;");
    expect(result).toContain("await commandHandler(context);");
  });

  it('should generate global handler initialization when global handlers exist', () => {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map([
        ['env', {
          path: './app/env.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'env')!,
        }],
        ['middleware', {
          path: './app/middleware.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'middleware')!,
        }],
        ['global-error', {
          path: './app/global-error.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'global-error')!,
        }],
      ]),
    };

    const options: LazyCliOptions = {
      commands: [],
      hasParams: false,
      hasHelp: false,
      hasError: false,
      structure,
    };

    const result = generateLazyCLI(options);

    // Check global handler initialization
    expect(result).toContain("// Global handler initialization");
    expect(result).toContain("const globalHandlers = {};");
    
    // Check env handler loading - paths are transformed to ../examples/
    expect(result).toContain("const envModule = await import('../examples/env.js');");
    expect(result).toContain("globalHandlers['env'] = envModule.default;");

    // Check middleware handler loading - paths are transformed to ../examples/
    expect(result).toContain("const middlewareModule = await import('../examples/middleware.js');");
    expect(result).toContain("globalHandlers['middleware'] = middlewareModule.default;");

    // Check global-error handler loading - paths are transformed to ../examples/
    expect(result).toContain("const global_errorModule = await import('../examples/global-error.js');");
    expect(result).toContain("globalHandlers['global-error'] = global_errorModule.default;");
  });

  it('should generate fallback CLI when structure is not provided', () => {
    const commands: CommandInfo[] = [
      {
        name: 'test',
        path: './app/test/command.js',
        hasParams: false,
      }
    ];

    const options: LazyCliOptions = {
      commands,
      hasParams: false,
      hasHelp: false,
      hasError: false,
      // No structure provided
    };

    // Should generate a fallback CLI using executeCommand
    const result = generateLazyCLI(options);
    expect(result).toContain("await executeCommand('./app/test/command.js', commandArgs);");
    expect(result).not.toContain('// Global handler initialization');
  });

  it('should handle error handlers in unified approach', () => {
    const structure: CLIStructure = {
      commands: [],
      params: [],
      help: [],
      errors: [],
      handlers: new Map([
        ['hello/command', {
          path: './app/hello/command.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'command')!,
          commandPath: 'hello',
        }],
        ['hello/error', {
          path: './app/hello/error.ts',
          definition: HANDLER_REGISTRY.find(h => h.name === 'error')!,
          commandPath: 'hello',
        }],
      ]),
    };

    const commands: CommandInfo[] = [
      {
        name: 'hello',
        path: './app/hello/command.js',
        hasParams: false,
      }
    ];

    const options: LazyCliOptions = {
      commands,
      hasParams: false,
      hasHelp: false,
      hasError: true,
      structure,
    };

    const result = generateLazyCLI(options);

    // Check error handler import - paths are transformed to ../examples/
    expect(result).toContain("const errorModule = await import('../examples/hello/error.js');");

    // Check try-catch wrapper
    expect(result).toContain("try {");
    expect(result).toContain("} catch (error) {");
    expect(result).toContain("const errorHandler = errorModule.default;");
    expect(result).toContain("await errorHandler({ ...context, error });");
  });
});