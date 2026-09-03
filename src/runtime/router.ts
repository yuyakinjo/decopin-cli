/** cmd.tsx のルート解決を公開する互換エントリ。 */
export {
  closest,
  commandsUnder,
  resolveRoute,
  resolveTarget,
  suggest,
} from '../features/conventions/cmd/router.ts';
export type {
  Resolved,
  RouteLoaders,
  RouteTable,
  Target,
} from '../features/conventions/cmd/router.ts';
