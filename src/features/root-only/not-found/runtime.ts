import type { Presentation } from '../../../runtime/override.ts';
import {
  presentNotFound,
  type NotFoundProps,
} from '../../conventions/not-found/runtime.tsx';

/** ルートの not-found.tsx で未知のコマンドを表示する。 */
export function presentRootNotFound(
  loader: (() => Promise<unknown>) | undefined,
  props: NotFoundProps
): Promise<Presentation> {
  return presentNotFound(loader, props);
}
