import type { Declaration } from '../../../core/jsx/types.ts';

export const FILE_NAME = 'output' as const;

/** `output.tsx` の default export が返すもの。`<Output>` の要素 */
export type OutputDefinition = Declaration;
