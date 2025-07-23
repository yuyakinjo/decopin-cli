import type { CommandDefinition, CommandGenerator, GeneratedCode } from './types.js';
import type { CLIStructure } from '../core/types.js';
import { generateLazyCLI, type LazyCliOptions, type CommandInfo } from '../generator/lazy-cli-template.js';

export class CommandGeneratorImpl implements CommandGenerator {
  async generate(commands: CommandDefinition[], _structure?: CLIStructure): Promise<GeneratedCode> {
    // Convert command definitions to the format expected by lazy CLI template
    const commandInfos: CommandInfo[] = commands.map(cmd => ({
      name: cmd.name,
      path: this.getCommandModulePath(cmd),
      hasParams: cmd.hasParams,
      aliases: cmd.metadata?.aliases || []
    }));

    const options: LazyCliOptions = {
      commands: commandInfos,
      hasParams: commands.some(cmd => cmd.hasParams),
      hasHelp: commands.some(cmd => cmd.hasHelp),
      hasError: commands.some(cmd => cmd.hasError)
    };

    const content = generateLazyCLI(options);

    return {
      content,
      imports: [] // Imports are handled within the template
    };
  }

  createImports(_commands: CommandDefinition[]): string[] {
    // Dynamic imports are generated inline in the lazy CLI template
    return [];
  }

  private getCommandModulePath(cmd: CommandDefinition): string {
    // Generate the runtime path for the command module
    const commandDir = cmd.name === 'root' ? '.' : cmd.name;
    return `./app/${commandDir}/command.js`;
  }
}

export async function generate(commands: CommandDefinition[], structure?: CLIStructure): Promise<GeneratedCode> {
  const generator = new CommandGeneratorImpl();
  return generator.generate(commands, structure);
}