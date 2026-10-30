/**
 * 規約ファイルが呼ばれる順番の図 (#77) が、今の `run()` の写しであること。
 *
 * 図は scripts/lifecycle.tsx が実際に回して記録したもの。`run.tsx` を直して
 * 順番が変わったのに図が古いままなら、ここで落ちる (ADR 15)
 */
import { describe, expect, test } from 'bun:test';

import {
  DOC,
  END,
  renderLifecycle,
  splice,
  START,
  traceLifecycle,
} from '../../scripts/lifecycle.tsx';

const scenarios = await traceLifecycle();

describe('ライフサイクル図', () => {
  test('project-structure.md の図が今の実行順と一致する (古ければ bun run docs:lifecycle)', async () => {
    const document = await Bun.file(DOC).text();
    expect(document).toBe(splice(document, renderLifecycle(scenarios)));
  });

  test('目印が無ければ黙って素通りせずに投げる', () => {
    expect(() => splice('no markers', `${START}\n${END}`)).toThrow(START);
  });

  test('middleware の内側で cmd.tsx が呼ばれ、layout はその外で包む', () => {
    const files = (scenarios[0]?.steps ?? []).map(
      (step) =>
        `${step.file}${step.phase === undefined ? '' : ` ${step.phase}`}`
    );
    const at = (file: string) => files.indexOf(file);
    expect(at('user/middleware.tsx before next()')).toBeLessThan(
      at('user/show/cmd.tsx')
    );
    expect(at('user/show/cmd.tsx')).toBeLessThan(
      at('user/middleware.tsx after next()')
    );
    expect(at('middleware.tsx after next()')).toBeLessThan(at('layout.tsx'));
  });
});
