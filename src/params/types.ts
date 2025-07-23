export interface ParamsParser {
  parse(content: string, filePath: string): Promise<ParamsDefinition>;
  extractSchema(definition: ParamsDefinition): SchemaDefinition;
}

export interface ParamsValidator {
  validate(data: unknown, schema: SchemaDefinition): Promise<ValidationResult>;
  createRuntimeValidator(schema: SchemaDefinition): string;
}

export interface ParamsDefinition {
  commandPath: string;
  schema: SchemaDefinition;
  mappings?: ParamMapping[];
}

export interface SchemaDefinition {
  type: 'valibot' | 'zod' | 'manual';
  code: string;
  imports?: string[];
}

export interface ParamMapping {
  from: string;
  to: string;
  type?: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
}