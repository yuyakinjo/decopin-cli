import type { ParamsValidator, SchemaDefinition, ValidationResult } from './types.js';

export class ValibotValidator implements ParamsValidator {
  async validate(data: unknown, _schema: SchemaDefinition): Promise<ValidationResult> {
    // Runtime validation will be handled by the generated code
    // This is just a placeholder for the architecture
    return {
      success: true,
      data
    };
  }

  createRuntimeValidator(_schema: SchemaDefinition): string {
    return `
// Valibot validator
import * as v from 'valibot';

export async function validate(data) {
  try {
    const result = await v.parseAsync(schema, data);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      errors: error.issues?.map(issue => ({
        path: issue.path?.join('.') || '',
        message: issue.message
      })) || []
    };
  }
}
`;
  }
}

export class ZodValidator implements ParamsValidator {
  async validate(data: unknown, _schema: SchemaDefinition): Promise<ValidationResult> {
    // Runtime validation will be handled by the generated code
    return {
      success: true,
      data
    };
  }

  createRuntimeValidator(_schema: SchemaDefinition): string {
    return `
// Zod validator
import { z } from 'zod';

export async function validate(data) {
  try {
    const result = await schema.parseAsync(data);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      errors: error.errors?.map(err => ({
        path: err.path.join('.'),
        message: err.message
      })) || []
    };
  }
}
`;
  }
}

export class ManualValidator implements ParamsValidator {
  async validate(data: unknown, _schema: SchemaDefinition): Promise<ValidationResult> {
    // Manual validation is handled at runtime
    return {
      success: true,
      data
    };
  }

  createRuntimeValidator(_schema: SchemaDefinition): string {
    return `
// Manual validator
export async function validate(data) {
  // Manual validation logic will be injected here
  return { success: true, data };
}
`;
  }
}

export function createValibotValidator(): ParamsValidator {
  return new ValibotValidator();
}

export function createZodValidator(): ParamsValidator {
  return new ZodValidator();
}

export function createManualValidator(): ParamsValidator {
  return new ManualValidator();
}