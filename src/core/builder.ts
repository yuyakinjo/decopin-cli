import type { CLIStructure, BuildOptions } from './types.js';

export interface ModuleLoaders {
  commands: any | null;
  params: any | null;
  help: any | null;
  error: any | null;
}

export async function generateCLI(
  structure: CLIStructure, 
  loaders: ModuleLoaders,
  _options: BuildOptions
): Promise<{
  content: string;
  types?: string;
}> {
  const commandImports: string[] = [];

  // Generate dynamic imports for each command
  if (loaders.commands && structure.commands.length > 0) {
    const commandData = await loaders.commands.parseCommands(structure.commands);
    const commandCode = await loaders.commands.generateCommands(commandData);
    commandImports.push(...commandCode.imports);
  }

  // Build the CLI content
  let content = `#!/usr/bin/env node
import { argv, exit } from 'process';

// Parse command line arguments
const args = argv.slice(2);
const command = args[0];

`;

  // Add lazy-loaded command execution
  content += `
// Command execution with lazy loading
async function executeCommand() {
  switch (command) {
`;

  for (const cmd of structure.commands) {
    const cmdName = cmd.name === 'root' ? 'default' : cmd.name;
    content += `    case '${cmdName}':
      const ${cmdName}Module = await import('./${cmd.name}/command.js');
      return ${cmdName}Module.default(args.slice(1));
`;
  }

  content += `    default:
      console.error(\`Unknown command: \${command}\`);
      exit(1);
  }
}

// Main execution
executeCommand().catch(err => {
  console.error(err);
  exit(1);
});
`;

  return { content };
}