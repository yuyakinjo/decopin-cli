import type { ValidationError, ValidationIssue } from '../../types/errors.js';
import type {
  ManualFieldSchema,
  ManualSchema,
  ValidationResult,
} from '../../types/validation.js';
import { isBoolean, isString } from '../guards/index.js';

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
export function validateWithManualSchema(
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
