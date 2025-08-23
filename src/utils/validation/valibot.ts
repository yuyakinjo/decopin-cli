import * as v from 'valibot';
import type { ValidationError, ValidationIssue } from '../../types/errors.js';
import type { ParamMapping, ValidationResult } from '../../types/validation.js';

/**
 * マッピングからValibotスキーマを作成
 */
export function createSchemaFromMappings(
  mappings: ParamMapping[]
): v.GenericSchema {
  const shape: Record<string, v.GenericSchema> = {};

  for (const mapping of mappings) {
    let fieldSchema: v.GenericSchema;
    switch (mapping.type) {
      case 'number':
        fieldSchema = v.pipe(
          v.union([v.string(), v.number()]),
          v.transform((input) => {
            if (typeof input === 'number') return input;
            const num = Number(input);
            if (Number.isNaN(num)) {
              throw new Error(`Invalid number: ${input}`);
            }
            return num;
          })
        );
        break;
      case 'boolean':
        fieldSchema = v.pipe(
          v.union([v.string(), v.boolean()]),
          v.transform((input) => {
            if (typeof input === 'boolean') return input;
            if (input === 'true' || input === '1' || input === 'yes')
              return true;
            if (input === 'false' || input === '0' || input === 'no')
              return false;
            throw new Error(`Invalid boolean: ${input}`);
          })
        );
        break;
      case 'array':
        fieldSchema = v.pipe(
          v.string(),
          v.transform((input) => input.split(',').map((s) => s.trim()))
        );
        break;
      case 'object':
        fieldSchema = v.pipe(
          v.string(),
          v.transform((input) => {
            try {
              return JSON.parse(input);
            } catch {
              throw new Error(`Invalid JSON: ${input}`);
            }
          })
        );
        break;
      default:
        fieldSchema = v.string();
        break;
    }

    if (mapping.required) {
      shape[mapping.field] = fieldSchema;
    } else {
      shape[mapping.field] = v.optional(fieldSchema);
    }
  }

  return v.object(shape);
}

/**
 * Valibotスキーマでバリデーションを実行
 */
export function validateWithValibotSchema(
  schema: v.GenericSchema,
  data: Record<string, unknown>
): ValidationResult {
  const result = v.safeParse(schema, data);

  if (result.success) {
    return {
      success: true,
      data: result.output,
    };
  } else {
    const error = new Error('Validation failed') as ValidationError;
    error.issues = result.issues.map((issue) => ({
      path: issue.path?.map((p) => ({ key: String(p.key) })) || [],
      message: issue.message,
    }));
    return {
      success: false,
      error,
    };
  }
}
