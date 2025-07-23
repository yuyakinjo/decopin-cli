import type { HelpParser, HelpDefinition } from './types.js';
import type { FileReference } from '../core/types.js';
import { parseHelpFile } from '../parser/help-parser.js';

export class HelpParserImpl implements HelpParser {
  async parse(files: FileReference[]): Promise<HelpDefinition[]> {
    const definitions: HelpDefinition[] = [];

    for (const file of files) {
      try {
        // Parse using the existing help parser
        const result = await parseHelpFile(file.path);
        
        if (result.help) {
          const helpDef: HelpDefinition = {
            commandPath: this.getCommandPath(file.path),
            name: result.help.name,
            description: result.help.description
          };
          
          if (result.help.examples) {
            helpDef.examples = result.help.examples;
          }
          if (result.help.aliases) {
            helpDef.aliases = result.help.aliases;
          }
          if (result.help.additionalHelp) {
            helpDef.additionalHelp = result.help.additionalHelp;
          }
          
          definitions.push(helpDef);
        }
      } catch (error) {
        console.error(`Failed to parse help file ${file.path}:`, error);
      }
    }

    return definitions;
  }

  private getCommandPath(filePath: string): string {
    // Extract command path from file path
    // e.g., "app/user/create/help.ts" -> "user/create"
    const match = filePath.match(/app\/(.*)\/help\.ts$/);
    if (!match) return '';
    
    const path = match[1];
    return path === '.' ? '' : path;
  }
}