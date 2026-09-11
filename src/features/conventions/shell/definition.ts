import type { Declaration } from '../../../core/jsx/types.ts';

export const FILE_NAME = 'shell' as const;

/** `shell.tsx` の default export が返すもの。`<Shell.*>` の要素 */
export type ShellDefinition = Declaration;
