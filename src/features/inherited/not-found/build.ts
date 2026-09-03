import {
  createInheritedChains,
  type InheritedFilesByDirectory,
  type InheritedRoute,
} from '../chain.ts';

/** not-found.tsx を自分から親へ向かう順に並べる。 */
export function createNotFoundChains(
  routes: readonly InheritedRoute[],
  inherited: InheritedFilesByDirectory
): Map<string, string[]> {
  return createInheritedChains(routes, inherited, 'not-found', 'nearest-first');
}
