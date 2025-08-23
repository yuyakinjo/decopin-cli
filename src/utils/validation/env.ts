import type { ValidationError, ValidationIssue } from '../../types/errors.js';
import type {
  EnvFieldSchema,
  EnvSchema,
  EnvValidationResult,
} from '../../types/validation.js';

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
