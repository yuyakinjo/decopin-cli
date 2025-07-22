import * as v from 'valibot';
import type {
  ParamsDefinition,
  ValidationFunction,
} from '../types/validation.js';

/**
 * パラメータからデータを抽出（valibot専用）
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

    // オプションから値を取得
    if (mapping.option && options[mapping.option] !== undefined) {
      value = options[mapping.option];
    }
    // 位置引数から値を取得
    else if (
      mapping.argIndex !== undefined &&
      args[mapping.argIndex] !== undefined
    ) {
      value = args[mapping.argIndex];
    }
    // デフォルト値を使用
    else if (mapping.defaultValue !== undefined) {
      value = mapping.defaultValue;
    }

    data[mapping.field] = value;
  }

  return data;
}

/**
 * Valibotバリデーション関数を作成
 */
export function createValidationFunction(
  paramsDefinition: ParamsDefinition
): ValidationFunction {
  return async (args, options, params) => {
    try {
      // データを抽出
      const data = extractData(args, options, params, paramsDefinition);

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
