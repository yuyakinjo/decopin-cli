/**
 * bun:test のアダプタ。ランナー依存はこのファイルだけに閉じる。
 * vitest / jest / node:test を使うなら、同じ形の 3 行を隣に置く。
 */
import { afterAll, describe, test } from 'bun:test';

import { createEvidence } from './evidence.ts';

export const { describeBehavior, proves, report } = createEvidence({
  afterAll,
  describe,
  test,
});
