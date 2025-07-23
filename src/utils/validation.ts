import * as v from 'valibot';
import type {
  ManualFieldSchema,
  ManualSchema,
  ParamsDefinition,
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
    typeof obj.kind === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.async === 'boolean' &&
    typeof obj['~run'] === 'function'
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
      typeof (field as ManualFieldSchema).type === 'string' &&
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
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
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
  const issues: Array<{ path: string[]; message: string }> = [];

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldResult = validateField(data[fieldName], fieldName, fieldSchema);

    if (fieldResult.success) {
      if (fieldResult.value !== undefined) {
        result[fieldName] = fieldResult.value;
      }
    } else {
      issues.push({
        path: [fieldName],
        message: fieldResult.error || 'Validation failed',
      });
    }
  }

  if (issues.length > 0) {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        issues,
      },
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
  paramsDefinition: ParamsDefinition
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

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

  return data;
}

/**
 * バリデーション関数を作成（スキーマタイプ自動判別対応）
 */
export function createValidationFunction(
  paramsDefinition: ParamsDefinition
): ValidationFunction {
  return async (args, options, params) => {
    try {
      // データを抽出
      const data = extractData(args, options, params, paramsDefinition);

      // スキーマタイプの自動判別
      if (isValibotSchema(paramsDefinition.schema)) {
        // valibotバリデーション
        const result = v.safeParse(paramsDefinition.schema, data);

        if (result.success) {
          return {
            success: true,
            data: result.output,
          };
        } else {
          return {
            success: false,
            error: {
              message: 'Validation failed',
              issues: result.issues.map((issue) => ({
                path: issue.path?.map((p) => String(p.key)) || [],
                message: issue.message,
              })),
            },
          };
        }
      } else if (isManualSchema(paramsDefinition.schema)) {
        // オブジェクトベースのバリデーション
        return validateWithManualSchema(data, paramsDefinition.schema);
      } else {
        throw new Error(
          'Invalid schema: Must be either a valibot schema or a manual schema object'
        );
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown validation error',
        },
      };
    }
  };
}
