import type { Declaration } from '../../../core/jsx/types.ts';

export const FILE_NAME = 'version' as const;

/** `version.tsx` の default export が返すもの。`<Version>` の要素 */
export type VersionDefinition = Declaration;
