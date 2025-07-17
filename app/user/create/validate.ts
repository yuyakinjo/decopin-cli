import { createValidationFunction } from  '../../../dist/utils/validation.js';
import createParams from './params.js';

export default function createValidate() {
  // params.tsの定義を使ってバリデーション関数を作成
  const paramsDefinition = createParams();
  return createValidationFunction(paramsDefinition);
}