import type { Presentation } from '../../../core/runtime/override.ts';
import {
  presentNotFound,
  type NotFoundProps,
} from '../../conventions/not-found/runtime.tsx';

/** 最も近い継承 not-found.tsx で notFound() の結果を表示する。 */
export function presentInheritedNotFound(
  loaders: readonly (() => Promise<unknown>)[] | undefined,
  props: NotFoundProps
): Promise<Presentation> {
  return presentNotFound(loaders?.[0], props);
}
