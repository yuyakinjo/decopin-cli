import type { ParsedCommand } from '../types/command.js';

/**
 * 型定義を生成
 */
export function generateTypeDefinitions(commands: ParsedCommand[]): string {
  const commandInterfaces = commands
    .map((cmd) => {
      const interfaceName = generateInterfaceName(cmd.path || 'root');
      const properties = generateInterfaceProperties(cmd);

      return `export interface ${interfaceName}Context {
  args: string[];
  options: Record<string, string | boolean>;
  params: Record<string, string>;
  showHelp: () => void;
${properties}
}`;
    })
    .join('\n\n');

  return `// Generated type definitions
// Built with decopin-cli

${commandInterfaces}

export interface CLIContext {
  args: string[];
  options: Record<string, string | boolean>;
  params: Record<string, string>;
  showHelp: () => void;
  validatedData?: unknown;
}

export type CLIHandler = (context: CLIContext) => Promise<void> | void;

export interface CLICommand {
  handler: CLIHandler;
  metadata?: {
    name?: string;
    description?: string;
    examples?: string[];
    aliases?: string[];
  };
}
`;
}

/**
 * インターフェース名を生成
 */
function generateInterfaceName(path: string): string {
  if (!path) return 'Root';

  return path
    .split('/')
    .map((segment) => {
      // 動的パラメータ [id] を ID に変換
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return segment.slice(1, -1).toUpperCase();
      }
      // kebab-case を PascalCase に変換
      return segment
        .split('-')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
    })
    .join('');
}

/**
 * インターフェースプロパティを生成
 */
function generateInterfaceProperties(cmd: ParsedCommand): string {
  const properties: string[] = [];

  // 動的パラメータがある場合
  if (cmd.dynamicParams && cmd.dynamicParams.length > 0) {
    for (const param of cmd.dynamicParams) {
      properties.push(`  ${param.name}: string;`);
    }
  }

  // メタデータがある場合
  if (cmd.definition.metadata) {
    properties.push(`  metadata: {`);
    if (cmd.definition.metadata.name) {
      properties.push(`    name: string;`);
    }
    if (cmd.definition.metadata.description) {
      properties.push(`    description: string;`);
    }
    properties.push(`  };`);
  }

  return properties.join('\n');
}
