import * as v from 'valibot';
import { isBoolean, isFunction, isString } from '../internal/guards/index.js';
import type { ValidationError, ValidationIssue } from '../types/errors.js';
import type {
  EnvFieldSchema,
  EnvSchema,
  EnvValidationResult,
  ManualFieldSchema,
  ManualSchema,
  ParamMapping,
  ParamsHandler,
  ValidationFunction,
  ValidationResult,
} from '../types/validation.js';

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
 * 値を指定された型に変換
 */
function transformValue(
  value: unknown,
  fieldSchema: ManualFieldSchema
): unknown {
  // カスタム変換がある場合はそれを優先
  if (fieldSchema.transform) {
    return fieldSchema.transform(value);
  }

  // 基本的な型変換
  switch (fieldSchema.type) {
    case 'string':
      return String(value);
    case 'number': {
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    }
    case 'boolean':
      if (isBoolean(value)) return value;
      if (isString(value)) {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);
    default:
      return value;
  }
}

/**
 * フィールドをバリデーション
 */
function validateField(
  value: unknown,
  fieldName: string,
  fieldSchema: ManualFieldSchema
): { success: boolean; value?: unknown; error?: string } {
  // 値がundefinedで必須フィールドの場合
  if (value === undefined) {
    if (fieldSchema.required) {
      return { success: false, error: `${fieldName} is required` };
    }
    // デフォルト値があれば使用
    if (fieldSchema.defaultValue !== undefined) {
      value = fieldSchema.defaultValue;
    } else {
      return { success: true, value: undefined };
    }
  }

  // 型変換
  const transformedValue = transformValue(value, fieldSchema);

  // 型チェック
  const actualType = typeof transformedValue;
  if (fieldSchema.type !== actualType) {
    return {
      success: false,
      error: `${fieldName} must be of type ${fieldSchema.type}, but got ${actualType}`,
    };
  }

  // 数値の範囲チェック
  if (fieldSchema.type === 'number') {
    const num = transformedValue as number;
    if (Number.isNaN(num)) {
      return { success: false, error: `${fieldName} must be a valid number` };
    }
    if (fieldSchema.minValue !== undefined && num < fieldSchema.minValue) {
      return {
        success: false,
        error: `${fieldName} must be at least ${fieldSchema.minValue}`,
      };
    }
    if (fieldSchema.maxValue !== undefined && num > fieldSchema.maxValue) {
      return {
        success: false,
        error: `${fieldName} cannot exceed ${fieldSchema.maxValue}`,
      };
    }
  }

  // 文字列の長さチェック
  if (fieldSchema.type === 'string') {
    const str = transformedValue as string;
    if (
      fieldSchema.minLength !== undefined &&
      str.length < fieldSchema.minLength
    ) {
      return {
        success: false,
        error: `${fieldName} must be at least ${fieldSchema.minLength} characters`,
      };
    }
    if (
      fieldSchema.maxLength !== undefined &&
      str.length > fieldSchema.maxLength
    ) {
      return {
        success: false,
        error: `${fieldName} cannot exceed ${fieldSchema.maxLength} characters`,
      };
    }
  }

  // 列挙値チェック
  if (
    fieldSchema.enum &&
    !fieldSchema.enum.includes(transformedValue as string | number)
  ) {
    return {
      success: false,
      error: `${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`,
    };
  }

  // カスタムバリデーション
  if (fieldSchema.validate) {
    const customError = fieldSchema.validate(transformedValue);
    if (customError) {
      return { success: false, error: customError };
    }
  }

  return { success: true, value: transformedValue };
}

/**
 * オブジェクトベースのスキーマでバリデーション
 */
function validateWithManualSchema(
  data: Record<string, unknown>,
  schema: ManualSchema
): ValidationResult {
  const result: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldResult = validateField(data[fieldName], fieldName, fieldSchema);

    if (fieldResult.success) {
      if (fieldResult.value !== undefined) {
        result[fieldName] = fieldResult.value;
      }
    } else {
      issues.push({
        path: [{ key: fieldName }],
        message: fieldResult.error || 'Validation failed',
      });
    }
  }

  if (issues.length > 0) {
    const error = new Error('Validation failed') as ValidationError;
    error.issues = issues;
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    data: result,
  };
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

/**
 * マッピングからValibotスキーマを作成
 */
function createSchemaFromMappings(mappings: ParamMapping[]): v.GenericSchema {
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
function validateWithValibotSchema(
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
          return validateWithManualSchema(data, paramsDefinition.schema);
        } else if (isValibotSchema(paramsDefinition.schema)) {
          return validateWithValibotSchema(paramsDefinition.schema, data);
        } else {
          throw new Error('Invalid schema type');
        }
      } else if (paramsDefinition.mappings) {
        // Mappings-only: create schema from mappings
        const data = extractData(args, options, params, paramsDefinition);

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
          return validateWithValibotSchema(paramsDefinition.schema, data);
        } else if (isManualSchema(paramsDefinition.schema)) {
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

/**
 * 環境変数の値を指定された型に変換
 */
function transformEnvValue(
  value: string | undefined,
  fieldSchema: EnvFieldSchema
): unknown {
  if (value === undefined) {
    return fieldSchema.default;
  }

  // 基本的な型変換
  switch (fieldSchema.type) {
    case 'string':
      return value;
    case 'number': {
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    }
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    default:
      return value;
  }
}

/**
 * 環境変数フィールドをバリデーション
 */
function validateEnvField(
  value: string | undefined,
  envName: string,
  fieldSchema: EnvFieldSchema
): { success: boolean; value?: unknown; error?: string } {
  // 値がundefinedで必須フィールドの場合
  if (value === undefined) {
    if (fieldSchema.required) {
      return {
        success: false,
        error: fieldSchema.errorMessage || `${envName} is required`,
      };
    }
    // デフォルト値があれば使用
    if (fieldSchema.default !== undefined) {
      return { success: true, value: fieldSchema.default };
    }
    return { success: true, value: undefined };
  }

  // 型変換
  const transformedValue = transformEnvValue(value, fieldSchema);

  // 型チェック
  const actualType = typeof transformedValue;
  if (fieldSchema.type !== actualType) {
    return {
      success: false,
      error:
        fieldSchema.errorMessage ||
        `${envName} must be of type ${fieldSchema.type}, but got ${actualType}`,
    };
  }

  // 数値の範囲チェック
  if (fieldSchema.type === 'number') {
    const num = transformedValue as number;
    if (Number.isNaN(num)) {
      return {
        success: false,
        error: fieldSchema.errorMessage || `${envName} must be a valid number`,
      };
    }
    if (fieldSchema.min !== undefined && num < fieldSchema.min) {
      return {
        success: false,
        error:
          fieldSchema.errorMessage ||
          `${envName} must be at least ${fieldSchema.min}`,
      };
    }
    if (fieldSchema.max !== undefined && num > fieldSchema.max) {
      return {
        success: false,
        error:
          fieldSchema.errorMessage ||
          `${envName} cannot exceed ${fieldSchema.max}`,
      };
    }
  }

  // 文字列の長さチェック
  if (fieldSchema.type === 'string') {
    const str = transformedValue as string;
    if (
      fieldSchema.minLength !== undefined &&
      str.length < fieldSchema.minLength
    ) {
      return {
        success: false,
        error:
          fieldSchema.errorMessage ||
          `${envName} must be at least ${fieldSchema.minLength} characters`,
      };
    }
    if (
      fieldSchema.maxLength !== undefined &&
      str.length > fieldSchema.maxLength
    ) {
      return {
        success: false,
        error:
          fieldSchema.errorMessage ||
          `${envName} cannot exceed ${fieldSchema.maxLength} characters`,
      };
    }
  }

  // 列挙値チェック
  if (
    fieldSchema.enum &&
    !fieldSchema.enum.includes(transformedValue as string | number)
  ) {
    return {
      success: false,
      error:
        fieldSchema.errorMessage ||
        `${envName} must be one of: ${fieldSchema.enum.join(', ')}`,
    };
  }

  return { success: true, value: transformedValue };
}

/**
 * 環境変数をパースして型安全なオブジェクトに変換
 */
export function parseEnvironmentVariables(
  envSchema: EnvSchema,
  env: Record<string, string | undefined> = process.env
): EnvValidationResult {
  const result: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];

  for (const [envName, fieldSchema] of Object.entries(envSchema)) {
    const fieldResult = validateEnvField(env[envName], envName, fieldSchema);

    if (fieldResult.success) {
      if (fieldResult.value !== undefined) {
        result[envName] = fieldResult.value;
      }
    } else {
      issues.push({
        path: [{ key: envName }],
        message: fieldResult.error || 'Environment variable validation failed',
      });
    }
  }

  if (issues.length > 0) {
    const error = new Error(
      'Environment variable validation failed'
    ) as ValidationError;
    error.issues = issues;
    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    data: result,
  };
}

/**
 * env.tsファイルからの環境変数パース（型安全な環境変数の生成）
 */
export async function createTypeSafeEnv<T extends Record<string, unknown>>(
  envDefinitionFunction: () => EnvSchema,
  env: Record<string, string | undefined> = process.env
): Promise<EnvValidationResult<T>> {
  try {
    const envSchema = envDefinitionFunction();
    const result = parseEnvironmentVariables(envSchema, env);

    if (result.success) {
      return {
        success: true,
        data: result.data as T,
      };
    } else {
      return result as EnvValidationResult<T>;
    }
  } catch (error) {
    const validationError =
      error instanceof Error
        ? error
        : new Error('Unknown environment variable error');

    // Ensure it's a proper ValidationError
    if (!('issues' in validationError)) {
      Object.assign(validationError, { issues: [] });
    }

    return {
      success: false,
      error: validationError as ValidationError,
    };
  }
}
