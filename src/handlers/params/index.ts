import type {
  ParamProcessingContext,
  ParamsHandler,
  ParamValidationFunction,
  ParamValidationResult,
} from './types.js';
import {
  createParamValidationFunction,
  extractParamData,
  isManualSchema,
  isValibotSchema,
} from './validation.js';

/**
 * パラメータハンドラーのメインクラス
 */
export class ParameterHandler {
  private validationFunction: ParamValidationFunction;

  constructor(private paramsDefinition: ParamsHandler) {
    this.validationFunction = createParamValidationFunction(paramsDefinition);
  }

  /**
   * パラメータを処理してバリデーション済みデータを返す
   */
  async process(
    context: ParamProcessingContext
  ): Promise<ParamValidationResult> {
    return await this.validationFunction(
      context.args,
      context.options,
      context.params
    );
  }

  /**
   * パラメータからデータを抽出（バリデーションなし）
   */
  extractData(context: ParamProcessingContext): Record<string, unknown> {
    return extractParamData(
      context.args,
      context.options,
      context.params,
      this.paramsDefinition
    );
  }

  /**
   * パラメータ定義を取得
   */
  getDefinition(): ParamsHandler {
    return this.paramsDefinition;
  }

  /**
   * スキーマタイプを判別
   */
  getSchemaType(): 'valibot' | 'manual' | 'mappings-only' | 'unknown' {
    if (this.paramsDefinition.mappings && !this.paramsDefinition.schema) {
      return 'mappings-only';
    }

    if (this.paramsDefinition.schema) {
      if (isValibotSchema(this.paramsDefinition.schema)) {
        return 'valibot';
      } else if (isManualSchema(this.paramsDefinition.schema)) {
        return 'manual';
      }
    }

    return 'unknown';
  }
}

/**
 * パラメータハンドラーを作成するファクトリー関数
 */
export function createParameterHandler(
  paramsDefinition: ParamsHandler
): ParameterHandler {
  return new ParameterHandler(paramsDefinition);
}

/**
 * パラメータを直接バリデーションする便利関数
 */
export async function validateParameters(
  args: string[],
  options: Record<string, string | boolean>,
  params: Record<string, string>,
  paramsDefinition: ParamsHandler
): Promise<ParamValidationResult> {
  const handler = createParameterHandler(paramsDefinition);
  return await handler.process({
    args,
    options,
    params,
    paramsDefinition,
  });
}

/**
 * パラメータからデータを抽出する便利関数
 */
export function extractParameterData(
  args: string[],
  options: Record<string, string | boolean>,
  params: Record<string, string>,
  paramsDefinition: ParamsHandler
): Record<string, unknown> {
  const handler = createParameterHandler(paramsDefinition);
  return handler.extractData({
    args,
    options,
    params,
    paramsDefinition,
  });
}

// Re-export types and validation utilities
export type {
  ManualFieldSchema,
  ManualSchema,
  ParamMapping,
  ParamProcessingContext,
  ParamsHandler,
  ParamValidationFunction,
  ParamValidationResult,
} from './types.js';

export {
  createParamValidationFunction,
  extractParamData,
  isManualSchema,
  isValibotSchema,
  validateWithManualSchema,
  validateWithValibotSchema,
} from './validation.js';
