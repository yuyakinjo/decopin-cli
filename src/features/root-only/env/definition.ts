import type { Declaration } from '../../../core/jsx/types.ts';

export const FILE_NAME = 'env' as const;

/** `env.tsx` の default export が返すもの。`<Env>` の要素 */
export type EnvDefinition = Declaration;
