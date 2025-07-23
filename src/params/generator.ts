import type { ParamsDefinition } from './types.js';

export class ParamsGeneratorImpl {
  generate(params: ParamsDefinition[]): string {
    const imports: string[] = [];
    const validators: string[] = [];

    for (const param of params) {
      const validatorName = this.getValidatorName(param.commandPath);
      const importPath = this.getImportPath(param.commandPath);
      
      imports.push(`import defer * as ${validatorName}Module from '${importPath}/params.js';`);
      
      validators.push(`  '${param.commandPath || 'root'}': async () => {
    const module = await ${validatorName}Module;
    return module.default;
  }`);
    }

    return `${imports.join('\n')}

const validators = {
${validators.join(',\n')}
};

export async function getValidator(commandPath: string) {
  const loader = validators[commandPath];
  if (!loader) {
    return null;
  }
  return loader();
}
`;
  }

  private getValidatorName(commandPath: string): string {
    if (!commandPath) return 'root';
    return commandPath.split('/').join('_');
  }

  private getImportPath(commandPath: string): string {
    if (!commandPath) return './';
    return `./${commandPath}`;
  }
}

export async function generate(params: ParamsDefinition[]): Promise<string> {
  const generator = new ParamsGeneratorImpl();
  return generator.generate(params);
}