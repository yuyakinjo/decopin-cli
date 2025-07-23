import type { HelpGenerator, HelpDefinition } from './types.js';

export class HelpGeneratorImpl implements HelpGenerator {
  async generate(helpDefs: HelpDefinition[]): Promise<string> {
    const helpMap: Record<string, HelpDefinition> = {};
    
    // Build help map
    for (const help of helpDefs) {
      const key = help.commandPath || 'root';
      helpMap[key] = help;
    }

    return `
// Generated help definitions
const helpDefinitions = ${JSON.stringify(helpMap, null, 2)};

export function getHelp(commandPath) {
  return helpDefinitions[commandPath || 'root'];
}

export function showHelp(commandPath) {
  const help = getHelp(commandPath);
  
  if (!help) {
    console.log('No help available for this command');
    return;
  }

  console.log('');
  if (help.name) {
    console.log(\`Command: \${help.name}\`);
  }
  
  if (help.description) {
    console.log(\`\\n\${help.description}\`);
  }
  
  if (help.usage) {
    console.log(\`\\nUsage:\\n  \${help.usage}\`);
  }
  
  if (help.examples && help.examples.length > 0) {
    console.log('\\nExamples:');
    help.examples.forEach(example => {
      console.log(\`  \${example}\`);
    });
  }
  
  if (help.aliases && help.aliases.length > 0) {
    console.log(\`\\nAliases: \${help.aliases.join(', ')}\`);
  }
  
  if (help.additionalHelp) {
    console.log(\`\\n\${help.additionalHelp}\`);
  }
  
  console.log('');
}

export async function showAllHelp() {
  console.log('Available commands:\\n');
  
  for (const [path, help] of Object.entries(helpDefinitions)) {
    const commandName = path === 'root' ? '(default)' : path;
    const description = help.description || 'No description';
    console.log(\`  \${commandName.padEnd(20)} \${description}\`);
  }
  
  console.log('\\nUse --help with any command for more details');
}
`;
  }

  createHelpCommand(commandPath: string): string {
    return `
export default async function helpCommand() {
  const { showHelp } = await import('./help/index.js');
  await showHelp('${commandPath}');
}
`;
  }
}