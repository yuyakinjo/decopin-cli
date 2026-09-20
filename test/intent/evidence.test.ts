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
  carries,
  collect,
  implement,
  type EvidenceStatus,
  intent,
  type IntentReport,
  toIndexLine,
  toReport,
  unproven,
  waived,
  waivedButProven,
} from './core.ts';
import { createEvidence, type Runner, shardName } from './evidence.ts';

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

describe('断片のファイル名', () => {
  /**
   * 1 つの Intent を 2 ファイルで分担し、片側だけを証明した断片。
   *
   * `toReport()` を使わないのは、Evidence が (Intent, Behavior) で
   * モジュールに貯まるから (core.ts の EVIDENCE)。同一プロセスでは impl を
   * 作り直しても累積され、**分担を再現できない**。別プロセスでは
   * 片側しか無い断片が出るので、その形を直接組む
   */
  const halfShard = (
    proved: 'a' | 'b',
    evidenceName: string
  ): IntentReport => ({
    id: 'split-across-files',
    purpose: '分担の検査',
    behaviors: (['a', 'b'] as const).map((id) => ({
      id,
      description: id,
      carriers: [],
      evidence:
        id === proved
          ? [{ name: evidenceName, status: 'passed' as const }]
          : [],
    })),
  });

  // 実測 2026-09-20: 証明名だけで印を作ると同名になり、プロセスを分けて
  // 並列に走らせたとき後勝ちで片方の証明が消えた
  test('別の Behavior を同じ証明名で分担しても衝突しない', () => {
    expect(shardName(halfShard('a', '同じ名前の証明'))).not.toBe(
      shardName(halfShard('b', '同じ名前の証明'))
    );
  });

  test('同じ分担なら同じ名前。断片が溢れない', () => {
    expect(shardName(halfShard('a', '証明'))).toBe(
      shardName(halfShard('a', '証明'))
    );
  });
});

/**
 * §8.3「Implementation Pattern が違っても Intent Graph は同じ」の検査。
 *
 * Question E の残り。8.1 (`carries()`) は実装のファイルに書くパターンなので、
 * ADR 48 で `src/ → test/intent/` の依存を禁じた以上、このリポジトリの
 * プロダクトコードには置けない (finding 28/29 と同じ壁)。**置き場の話を外して
 * 「同じ対応から組んだ 2 つの Implementation が同じ Graph になるか」だけを見る。**
 */
describe('2 つの Implementation Pattern', () => {
  test('同じ対応なら implement() と carries()+collect() の Graph が一致する', () => {
    const of = intent({
      id: 'two-patterns',
      purpose: '2 つのパターンが同じ Graph を作ることの検査',
      behaviors: [
        behavior('pattern-a', 'a'),
        behavior('pattern-b', 'b'),
      ] as const,
    });
    const where = 'test/intent/evidence.test.ts';
    function shared() {}
    function only() {}

    // 8.2 証明分離: 実装を指す表を別に置く
    const separated = implement(of, {
      'pattern-a': [carriedBy(shared, where)],
      'pattern-b': [carriedBy(shared, where), carriedBy(only, where)],
    });

    // 8.1 一方向: 宣言しながら値を通す。通す順が表の順になる
    carries(of, ['pattern-a', 'pattern-b'], shared, where);
    carries(of, ['pattern-b'], only, where);
    const oneWay = collect(of);

    expect(toReport(oneWay)).toEqual(toReport(separated));
  });

  test('carries() を書き忘れた Behavior は collect() が実行時に落とす', () => {
    const of = intent({
      id: 'one-way-gap',
      purpose: '一方向パターンの穴',
      behaviors: [behavior('gap-a', 'a'), behavior('gap-b', 'b')] as const,
    });
    function partOnly() {}
    carries(of, ['gap-a'], partOnly, 'test/intent/evidence.test.ts');
    // implement() なら引数の型が落ちる。8.1 は型で要求できない (core.ts §8.1)
    expect(() => collect(of)).toThrow('担い手のいない Behavior: gap-b');
  });
});

/**
 * 索引の形 (`doc.ts --list`)。全体のドキュメントは 390 行あり、人もエージェントも
 * 途中で読むのをやめて grep に切り替えた (README の 40)。結末の語彙で引ける
 * 長さにしてから詳細へ降りる、という使い方をここで固定する。
 */
describe('索引の行', () => {
  const report = (
    behaviors: { id: string; waiver?: string; status?: EvidenceStatus }[]
  ): IntentReport => ({
    id: 'indexed',
    purpose: '索引の検査',
    behaviors: behaviors.map((b) => ({
      id: b.id,
      description: b.id,
      carriers: [],
      waiver: b.waiver,
      evidence: b.status === undefined ? [] : [{ name: 'e', status: b.status }],
    })),
  });

  test('全部証明されていれば ✓ と数だけ', () => {
    expect(
      toIndexLine(report([{ id: 'a', status: 'passed' }])).split('\n')[0]
    ).toBe('✓ indexed  (1/1 ✓)');
  });

  test('免除は別に数え、合否は分けない', () => {
    expect(
      toIndexLine(
        report([
          { id: 'a', status: 'passed' },
          { id: 'b', waiver: '理由' },
        ])
      ).split('\n')[0]
    ).toBe('✓ indexed  (1/2 ✓ 1 –)');
  });

  test('証明の無い Behavior が 1 つでもあれば ✗', () => {
    expect(
      toIndexLine(report([{ id: 'a', status: 'passed' }, { id: 'b' }])).split(
        '\n'
      )[0]
    ).toBe('✗ indexed  (1/2 ✓ 1 ✗)');
  });

  test('2 行目は Purpose。結末の語彙で grep できる', () => {
    expect(toIndexLine(report([{ id: 'a', status: 'passed' }]))).toEndWith(
      '\n  索引の検査\n'
    );
  });
});
