import {
  createInheritedChains,
  type InheritedFilesByDirectory,
  type InheritedRoute,
} from '../chain.ts';

/** layout.tsx をルート側から内側へ包める順に並べる。 */
export function createLayoutChains(
  routes: readonly InheritedRoute[],
  inherited: InheritedFilesByDirectory
): Map<string, string[]> {
  return createInheritedChains(routes, inherited, 'layout', 'outer-first');
}
