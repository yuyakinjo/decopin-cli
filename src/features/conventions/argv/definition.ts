import type { Declaration } from '../../../core/jsx/types.ts';

export const FILE_NAME = 'argv' as const;

/** `argv.tsx` の default export が返すもの。`<Argv>` の要素 */
export type ArgvDefinition = Declaration;
