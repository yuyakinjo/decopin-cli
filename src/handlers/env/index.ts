import type {
  EnvContext,
  EnvExecutionOptions,
  EnvFieldSchema,
  EnvFieldType,
  EnvHandler,
  EnvHandlerFactory,
  EnvProcessingResult,
  EnvSchema,
  EnvValidationError,
  EnvValidationResult,
  EnvValue,
} from './types.js';

/**
 * 環境変数ハンドラーを処理する
 *
 * @param options - 環境変数ハンドラーの実行オプション
 * @returns 環境変数処理の結果
 */
export async function processEnvHandler<E = typeof process.env>(
  options: EnvExecutionOptions<E>
): Promise<EnvProcessingResult> {
  try {
    const { factory, context } = options;

    // ファクトリー関数を実行して環境変数スキーマを取得
    const schema =
      typeof factory === 'function' ? await factory(context) : factory;

    // 環境変数をバリデーション
    const validation = validateEnvironmentVariables(schema, context.env);

    return {
      schema,
      validation,
      context,
      success: validation.success,
      error: validation.success ? undefined : validation.errors,
    };
  } catch (error) {
    return {
      schema: {},
      validation: {
        success: false,
        data: {},
        errors: [
          {
            field: 'unknown',
            message: 'Failed to process environment handler',
            value: undefined,
            expectedType: 'string',
          },
        ],
      },
      context: options.context,
      success: false,
      error,
    };
  }
}

/**
 * 環境変数ハンドラーを実行してスキーマを取得する
 *
 * @param factory - 環境変数ハンドラーファクトリー
 * @param context - 実行コンテキスト
 * @returns 環境変数スキーマ
 */
export async function executeEnvHandler<E = typeof process.env>(
  factory: EnvHandlerFactory<E>,
  context: EnvContext<E>
): Promise<EnvHandler> {
  if (typeof factory === 'function') {
    return await factory(context);
  }
  return factory;
}

/**
 * 環境変数をバリデーションする
 *
 * @param schema - 環境変数スキーマ
 * @param env - 環境変数オブジェクト
 * @returns バリデーション結果
 */
export function validateEnvironmentVariables(
  schema: EnvSchema,
  env: Record<string, string | undefined>
): EnvValidationResult {
  const errors: EnvValidationError[] = [];
  const data: Record<string, EnvValue> = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const rawValue = env[fieldName];

    try {
      const validatedValue = validateEnvField(fieldName, rawValue, fieldSchema);
      data[fieldName] = validatedValue;
    } catch (error) {
      if (error instanceof Error) {
        errors.push({
          field: fieldName,
          message: error.message,
          value: rawValue,
          expectedType: fieldSchema.type,
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    data,
    errors,
  };
}

/**
 * 単一の環境変数フィールドをバリデーションする
 *
 * @param fieldName - フィールド名
 * @param rawValue - 生の値
 * @param schema - フィールドスキーマ
 * @returns バリデーション済みの値
 */
export function validateEnvField(
  fieldName: string,
  rawValue: string | undefined,
  schema: EnvFieldSchema
): EnvValue {
  // 値が未定義の場合の処理
  if (rawValue === undefined) {
    if (schema.required) {
      throw new Error(schema.errorMessage || `${fieldName} is required`);
    }
    return schema.default;
  }

  // 型に応じてバリデーション
  switch (schema.type) {
    case 'string':
      return validateStringField(fieldName, rawValue, schema);
    case 'number':
      return validateNumberField(fieldName, rawValue, schema);
    case 'boolean':
      return validateBooleanField(fieldName, rawValue, schema);
    default:
      throw new Error(`Unknown field type: ${schema.type}`);
  }
}

/**
 * 文字列フィールドをバリデーションする
 */
function validateStringField(
  fieldName: string,
  value: string,
  schema: EnvFieldSchema
): string {
  // 長さのバリデーション
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    throw new Error(
      schema.errorMessage ||
        `${fieldName} must be at least ${schema.minLength} characters`
    );
  }

  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    throw new Error(
      schema.errorMessage ||
        `${fieldName} must be at most ${schema.maxLength} characters`
    );
  }

  // 列挙値のバリデーション
  if (schema.enum && !schema.enum.includes(value)) {
    throw new Error(
      schema.errorMessage ||
        `${fieldName} must be one of: ${schema.enum.join(', ')}`
    );
  }

  return value;
}

/**
 * 数値フィールドをバリデーションする
 */
function validateNumberField(
  fieldName: string,
  value: string,
  schema: EnvFieldSchema
): number {
  const numValue = Number(value);

  if (isNaN(numValue)) {
    throw new Error(
      schema.errorMessage || `${fieldName} must be a valid number`
    );
  }

  // 範囲のバリデーション
  if (schema.min !== undefined && numValue < schema.min) {
    throw new Error(
      schema.errorMessage || `${fieldName} must be at least ${schema.min}`
    );
  }

  if (schema.max !== undefined && numValue > schema.max) {
    throw new Error(
      schema.errorMessage || `${fieldName} must be at most ${schema.max}`
    );
  }

  // 列挙値のバリデーション
  if (schema.enum && !schema.enum.includes(numValue)) {
    throw new Error(
      schema.errorMessage ||
        `${fieldName} must be one of: ${schema.enum.join(', ')}`
    );
  }

  return numValue;
}

/**
 * 真偽値フィールドをバリデーションする
 */
function validateBooleanField(
  fieldName: string,
  value: string,
  schema: EnvFieldSchema
): boolean {
  const lowerValue = value.toLowerCase();

  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  }

  if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
    return false;
  }

  throw new Error(
    schema.errorMessage ||
      `${fieldName} must be a valid boolean (true/false, 1/0, yes/no)`
  );
}

/**
 * 環境変数ハンドラーの妥当性を検証する
 *
 * @param factory - 検証する環境変数ハンドラーファクトリー
 * @returns 妥当性検証の結果
 */
export function validateEnvHandler(factory: EnvHandlerFactory): boolean {
  return typeof factory === 'function' || typeof factory === 'object';
}

/**
 * デフォルトの環境変数ハンドラーを作成する
 *
 * @returns デフォルトの環境変数ハンドラー
 */
export function createDefaultEnvHandler(): EnvHandler {
  return {
    NODE_ENV: {
      type: 'string',
      required: false,
      default: 'development',
      enum: ['development', 'production', 'test'],
      errorMessage: 'NODE_ENV must be development, production, or test',
    },
  };
}

/**
 * 環境変数バリデーションエラーをフォーマットして表示用の文字列を生成する
 *
 * @param errors - バリデーションエラーの配列
 * @returns フォーマットされたエラー文字列
 */
export function formatEnvValidationErrors(
  errors: EnvValidationError[]
): string {
  if (errors.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('Environment variable validation errors:');
  lines.push('');

  for (const error of errors) {
    lines.push(`  • ${error.field}: ${error.message}`);
    if (error.value !== undefined) {
      lines.push(`    Current value: ${error.value}`);
    }
    lines.push(`    Expected type: ${error.expectedType}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}
