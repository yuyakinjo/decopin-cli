import type * as v from 'valibot';
import type {
  EnvFieldSchema,
  EnvSchema,
  EnvValidationResult,
} from '../../handlers/env/types.js';
import type {
  ManualFieldSchema,
  ManualSchema,
  ParamMapping,
  ParamsHandler,
} from '../../handlers/params/types.js';
import type { ValidationError } from '../../types/errors.js';
import type {
  ValidationFunction,
  ValidationResult,
} from '../../types/validation.js';
import { isBoolean, isFunction, isString } from '../guards/index.js';

/**
 * スキーマがvalibotスキーマかどうかを判別
 */
export function isValibotSchema(schema: unknown): schema is v.GenericSchema {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  const obj = schema as Record<string, unknown>;

  // valibotスキーマの特徴的なプロパティをチェック
  return (
    isString(obj.kind) &&
    isString(obj.type) &&
    isBoolean(obj.async) &&
    isFunction(obj['~run'])
  );
}

/**
 * スキーマがオブジェクトベースのスキーマかどうかを判別
 */
export function isManualSchema(schema: unknown): schema is ManualSchema {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // valibotスキーマでない場合、オブジェクトベースのスキーマかチェック
  if (isValibotSchema(schema)) {
    return false;
  }

  const obj = schema as Record<string, unknown>;

  // すべてのプロパティがManualFieldSchemaの形式かチェック
  return Object.values(obj).every(
    (field) =>
      field &&
      typeof field === 'object' &&
      isString((field as ManualFieldSchema).type) &&
      ['string', 'number', 'boolean'].includes(
        (field as ManualFieldSchema).type
      )
  );
}

/**
 * パラメータからデータを抽出（valibot・オブジェクトベース共通）
 */
export function extractData(
  args: unknown[],
  options: Record<string, unknown>,
  _params: Record<string, string>,
  paramsDefinition: ParamsHandler
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Handle based on which property exists
  if (paramsDefinition.mappings) {
    for (const mapping of paramsDefinition.mappings) {
      let value: unknown;

      // 位置引数から値を取得（位置引数を優先）
      if (
        mapping.argIndex !== undefined &&
        args[mapping.argIndex] !== undefined
      ) {
        value = args[mapping.argIndex];
      }
      // オプションから値を取得
      else if (mapping.option && options[mapping.option] !== undefined) {
        value = options[mapping.option];
      }
      // デフォルト値を使用
      else if (mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      if (value !== undefined) {
        data[mapping.field] = value;
      }
    }
  }
  return data;
}

export function createValidationFunction(
  paramsDefinition: ParamsHandler
): ValidationFunction {
  return async (args, options, params) => {
    try {
      // Handle based on which property exists
      if (paramsDefinition.mappings && paramsDefinition.schema) {
        // Both mappings and schema: use mappings to extract data, then validate with schema
        const data = extractData(args, options, params, paramsDefinition);

        if (isManualSchema(paramsDefinition.schema)) {
          const { validateWithManualSchema } = await import('./manual.js');
          return validateWithManualSchema(data, paramsDefinition.schema);
        } else if (isValibotSchema(paramsDefinition.schema)) {
          const { validateWithValibotSchema } = await import('./valibot.js');
          return validateWithValibotSchema(paramsDefinition.schema, data);
        } else {
          throw new Error('Invalid schema type');
        }
      } else if (paramsDefinition.mappings) {
        // Mappings-only: create schema from mappings
        const data = extractData(args, options, params, paramsDefinition);

        const { createSchemaFromMappings, validateWithValibotSchema } =
          await import('./valibot.js');
        const schema = createSchemaFromMappings(paramsDefinition.mappings);
        return validateWithValibotSchema(schema, data);
      } else if (paramsDefinition.schema) {
        // Schema-based validation
        const data: Record<string, unknown> = {};
        // Pass raw arguments to schema
        args.forEach((arg, index) => {
          data[`arg${index}`] = arg;
        });
        Object.assign(data, options);

        // スキーマタイプの自動判別
        if (isValibotSchema(paramsDefinition.schema)) {
          const { validateWithValibotSchema } = await import('./valibot.js');
          return validateWithValibotSchema(paramsDefinition.schema, data);
        } else if (isManualSchema(paramsDefinition.schema)) {
          const { validateWithManualSchema } = await import('./manual.js');
          return validateWithManualSchema(data, paramsDefinition.schema);
        } else {
          throw new Error(
            'Invalid schema: Must be either a valibot schema or a manual schema object'
          );
        }
      }

      throw new Error(
        'Invalid ParamsHandler: must provide either schema or mappings'
      );
    } catch (error) {
      const validationError =
        error instanceof Error ? error : new Error('Unknown validation error');

      // Ensure it's a proper ValidationError
      if (!('issues' in validationError)) {
        Object.assign(validationError, { issues: [] });
      }

      return {
        success: false,
        error: validationError as ValidationError,
      };
    }
  };
}

// Re-export from sub-modules
export { createTypeSafeEnv, parseEnvironmentVariables } from './env.js';
export { validateWithManualSchema } from './manual.js';
export {
  createSchemaFromMappings,
  validateWithValibotSchema,
} from './valibot.js';
