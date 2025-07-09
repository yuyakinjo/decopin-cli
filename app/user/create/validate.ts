import { createValidationFunction } from '../../../src/utils/validation.js';
import paramsDefinition from './params.js';

// params.tsの定義を使ってバリデーション関数を作成
const validate = createValidationFunction(paramsDefinition);

export default validate;