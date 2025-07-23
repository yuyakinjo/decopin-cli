import { describe, it, expect } from 'bun:test';
import { generateLazyCLI, type LazyCliOptions, type CommandInfo } from '../../src/generator/lazy-cli-template.js';

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

    const options: LazyCliOptions = {
      commands,
      hasParams: true,
      hasHelp: false,
      hasError: false
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

    const options: LazyCliOptions = {
      commands,
      hasParams: false,
      hasHelp: false,
      hasError: false
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

    const options: LazyCliOptions = {
      commands,
      hasParams: true,
      hasHelp: false,
      hasError: false
    };

    const result = generateLazyCLI(options);

    // Root command should be 'default' case
    expect(result).toContain("case 'default':");
    expect(result).toContain("case 'main':");
  });
});