/**
 * Intent ランタイム (core.ts / evidence.ts) 自身のテスト。Evidence ではない。
 *
 * `createEvidence()` はランナーを注入できるので、偽のランナーで収集と実行を
 * 手で進め、ガードが噛むことを確かめる。README の「効くことを確認した」
 * (手で壊して見た記録) を機械に移したもの (ADR 48)。
 *
 * afterAll は走らせない。走らせると `.decopin-intent/` に断片が書かれ、
 * doc.ts が「宣言の無い Intent」として落とす。
 */
import { describe, expect, test } from 'bun:test';

import {
  behavior,
  type Carrier,
  carriedBy,
  implement,
  intent,
  toReport,
  unproven,
  waived,
  waivedButProven,
} from './core.ts';
import { createEvidence, type Runner } from './evidence.ts';

interface Outcome {
  readonly name: string;
  readonly error?: string;
}

/** 収集した test を順に走らせる偽のランナー */
function fakeRunner() {
  const tests: { name: string; fn: () => void | Promise<unknown> }[] = [];
  const runner: Runner = {
    describe: (_name, body) => body(),
    test: (name, fn) => {
      tests.push({ name, fn });
    },
    afterAll: () => {},
  };
  async function run(): Promise<Outcome[]> {
    const outcomes: Outcome[] = [];
    for (const { name, fn } of tests) {
      try {
        await fn();
        outcomes.push({ name });
      } catch (error) {
        outcomes.push({ name, error: (error as Error).message });
      }
    }
    return outcomes;
  }
  return { runner, run };
}

/**
 * Behavior 2 つの Intent。b は waiver を渡すと waived() になる。
 * Behavior id はプロセス内で一意 (§5.1) なので、テストごとに別の id を渡す
 */
function probe<const A extends string, const B extends string>(
  a: A,
  b: B,
  waiver?: string
) {
  const of = intent({
    id: `probe-${a}`,
    purpose: 'ランタイムの検査',
    behaviors: [
      behavior(a, 'a'),
      waiver === undefined ? behavior(b, 'b') : waived(b, 'b', waiver),
    ] as const,
  });
  function carrier() {}
  const where = 'test/intent/evidence.test.ts';
  return implement(of, {
    [a]: [carriedBy(carrier, where)],
    [b]: [carriedBy(carrier, where)],
  } as unknown as { readonly [K in A | B]: readonly Carrier[] });
}

const outcome = (outcomes: Outcome[], suffix: string) =>
  outcomes.find((o) => o.name.endsWith(suffix));

describe('report() の位置', () => {
  test('report() の後ろに describeBehavior を置くと throw する', () => {
    const { describeBehavior, proves, report } = createEvidence(
      fakeRunner().runner
    );
    const impl = probe('late-a', 'late-b');
    describeBehavior(impl, 'late-a', () => proves('a', () => {}));
    describeBehavior(impl, 'late-b', () => proves('b', () => {}));
    report(impl);
    expect(() =>
      describeBehavior(impl, 'late-b', () => proves('late', () => {}))
    ).toThrow('report() の後ろ');
  });

  test('report() は Intent ごとに 1 回', () => {
    const { describeBehavior, proves, report } = createEvidence(
      fakeRunner().runner
    );
    const impl = probe('twice-a', 'twice-b');
    describeBehavior(impl, 'twice-a', () => proves('a', () => {}));
    describeBehavior(impl, 'twice-b', () => proves('b', () => {}));
    report(impl);
    expect(() => report(impl)).toThrow('1 回だけ');
  });

  test('partial なら、分担する別ファイルの describeBehavior を許す', () => {
    const { describeBehavior, proves, report } = createEvidence(
      fakeRunner().runner
    );
    const impl = probe('part-a', 'part-b');
    describeBehavior(impl, 'part-a', () => proves('a', () => {}));
    report(impl, { partial: true });
    expect(() =>
      describeBehavior(impl, 'part-b', () => proves('b', () => {}))
    ).not.toThrow();
  });
});

describe('証明の判定', () => {
  test('落ちた証明は failed になり、全 Behavior の判定が落ちる', async () => {
    const { runner, run } = fakeRunner();
    const { describeBehavior, proves, report } = createEvidence(runner);
    const impl = probe('fail-a', 'fail-b');
    describeBehavior(impl, 'fail-a', () => {
      proves('通る', () => {});
      proves('落ちる', () => {
        throw new Error('boom');
      });
    });
    describeBehavior(impl, 'fail-b', () => proves('b', () => {}));
    report(impl);

    const outcomes = await run();
    expect(outcome(outcomes, '落ちる')?.error).toBe('boom');
    expect(outcome(outcomes, '全 Behavior が証明されている')?.error).toContain(
      'fail-a'
    );
    // 同じ Behavior に通った証明があっても ✓ にはならない (§11.7)
    expect(unproven(toReport(impl))).toEqual(['fail-a']);
  });

  test('証明できている waived() は落ちる (免除の自壊)', async () => {
    const { runner, run } = fakeRunner();
    const { describeBehavior, proves, report } = createEvidence(runner);
    const impl = probe('waive-a', 'waive-b', '検査用');
    describeBehavior(impl, 'waive-a', () => proves('a', () => {}));
    describeBehavior(impl, 'waive-b', () => proves('b', () => {}));
    report(impl);

    const outcomes = await run();
    expect(
      outcome(outcomes, '不要な waived() が残っていない')?.error
    ).toContain('waive-b');
    expect(waivedButProven(toReport(impl))).toEqual(['waive-b']);
  });

  test('waived() は証明を要求されない。理由が無ければ作れない', async () => {
    const { runner, run } = fakeRunner();
    const { describeBehavior, proves, report } = createEvidence(runner);
    const impl = probe('skip-a', 'skip-b', '検査用');
    describeBehavior(impl, 'skip-a', () => proves('a', () => {}));
    report(impl);

    const outcomes = await run();
    expect(outcomes.filter((o) => o.error !== undefined)).toEqual([]);
    expect(() => waived('skip-c', 'c', '')).toThrow();
  });
});

describe('describeBehavior の形', () => {
  test('proves() は describeBehavior の外では使えない', () => {
    const { proves } = createEvidence(fakeRunner().runner);
    expect(() => proves('外', () => {})).toThrow('describeBehavior の中');
  });

  test('describeBehavior は入れ子にしない', () => {
    const { describeBehavior } = createEvidence(fakeRunner().runner);
    const impl = probe('nest-a', 'nest-b');
    expect(() =>
      describeBehavior(impl, 'nest-a', () => {
        describeBehavior(impl, 'nest-b', () => {});
      })
    ).toThrow('入れ子');
  });

  test('宣言していない Behavior には書けない', () => {
    const { describeBehavior } = createEvidence(fakeRunner().runner);
    const impl = probe('undecl-a', 'undecl-b');
    expect(() => describeBehavior(impl, 'nope' as never, () => {})).toThrow(
      '宣言されていない'
    );
  });
});
