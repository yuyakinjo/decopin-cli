import type { Declaration } from '../../../core/jsx/types.ts';

export const FILE_NAME = 'stdin' as const;

/** `stdin.tsx` の default export が返すもの。`<Stdin>` の要素 */
export type StdinDefinition = Declaration;
