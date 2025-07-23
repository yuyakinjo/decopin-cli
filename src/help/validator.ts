import type { HelpValidator, HelpDefinition } from './types.js';

export class HelpValidatorImpl implements HelpValidator {
  async validate(help: HelpDefinition): Promise<boolean> {
    // Basic validation rules
    if (!help.commandPath && help.commandPath !== '') {
      console.warn('Help definition missing commandPath');
      return false;
    }

    if (!help.description) {
      console.warn(`Help for ${help.commandPath} missing description`);
      return false;
    }

    if (help.examples && !Array.isArray(help.examples)) {
      console.warn(`Help for ${help.commandPath} has invalid examples format`);
      return false;
    }

    if (help.aliases && !Array.isArray(help.aliases)) {
      console.warn(`Help for ${help.commandPath} has invalid aliases format`);
      return false;
    }

    return true;
  }
}