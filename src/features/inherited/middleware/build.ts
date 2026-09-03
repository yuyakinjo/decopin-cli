import {
  createInheritedChains,
  type InheritedFilesByDirectory,
  type InheritedRoute,
} from '../chain.ts';

/** middleware.tsx をルート側から内側へ実行できる順に並べる。 */
export function createMiddlewareChains(
  routes: readonly InheritedRoute[],
  inherited: InheritedFilesByDirectory
): Map<string, string[]> {
  return createInheritedChains(routes, inherited, 'middleware', 'outer-first');
}
