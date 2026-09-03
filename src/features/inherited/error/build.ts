import {
  createInheritedChains,
  type InheritedFilesByDirectory,
  type InheritedRoute,
} from '../chain.ts';

/** error.tsx を自分から親へ向かう順に並べる。 */
export function createErrorChains(
  routes: readonly InheritedRoute[],
  inherited: InheritedFilesByDirectory
): Map<string, string[]> {
  return createInheritedChains(routes, inherited, 'error', 'nearest-first');
}
