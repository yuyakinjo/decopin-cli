/** JSON Schema 生成の互換 façade。 */
export {
  argumentsSchema,
  STDIN_ARGUMENT,
} from '../features/conventions/argv/json-schema.ts';
export { toJsonSchema } from './json-schema-core.ts';
export type { JsonSchema } from './json-schema-core.ts';
