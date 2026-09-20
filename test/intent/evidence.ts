/**
 * Test = Evidence (§10)。テストランナーとの接続。
 *
 * **ランナーを直接 import しない。** 必要な面は `describe` / `test` /
 * `afterAll` の 3 つだけで、bun:test・vitest・jest・node:test のどれにもある。
 * 実物は `createEvidence()` に注入する (bun 版は `evidence.bun.ts`)。
 *
 * `describeBehavior` は普通の `describe` の言い換えに見えるが、2 つ違う:
 *
 * - 第 2 引数の id が `BehaviorId<I>` に縛られる。宣言していない Behavior に
 *   対するテストは書けないし、Behavior を消すと落ちる (Behavior ↔ Test)
 * - `proves()` が fn を包むので、**通ったものだけが ✓ になる**。
 *   ランナーの reporter API は要らない (実測)。落ちているテストが Evidence に
 *   数えられる = §11.7 False Verification の最も素朴な形を、これで塞ぐ。
 *   ただし**ランナーのタイムアウトは try/catch に届かない** (実測)。打ち切り
 *   後に `fn()` が解決すると ✓ が付いてしまうので、記録を一方向にした上で
 *   期限と「いま走っているテスト」の 2 つから打ち切りを見ている
 *
 * bun:test の `describe` の body は**収集時に呼ばれるが、呼び出しの直後では
 * ない** (実測)。ブロックを抜けた時点の集計はできないので、判定と書き出しは
 * ファイル末尾の `report()` に置いてある。**末尾であることは `report()` 自身が
 * 見張る** — 後ろに `describeBehavior` が来たら throw する (ADR 48)。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type BehaviorId,
  type Implementation,
  type Intent,
  type IntentReport,
  recordEvidence,
  toReport,
  unproven,
  waivedButProven,
} from './core.ts';

/** テストランナーに求める面。これ以上は使わない */
export interface Runner {
  describe: (name: string, body: () => void) => void;
  test: (
    name: string,
    fn: () => void | Promise<unknown>,
    timeout?: number
  ) => void;
  afterAll: (fn: () => void | Promise<unknown>) => void;
}

/** Evidence の断片の置き場。中間生成物なので gitignore する */
export const SHARD_DIR = '.decopin-intent';

/** createEvidence() が返すテスト用の入口 */
export interface EvidenceApi {
  describeBehavior: <I extends Intent>(
    impl: Implementation<I>,
    id: BehaviorId<I>,
    body: () => void
  ) => void;
  proves: (
    name: string,
    fn: () => void | Promise<unknown>,
    timeout?: number
  ) => void;
  report: (impl: Implementation, options?: ReportOptions) => void;
}

export interface ReportOptions {
  /**
   * この Intent の Behavior を、複数のテストファイルで分担して証明している。
   *
   * 既定 (false) は「1 ファイルで全部証明する」。Evidence の記録はプロセス内
   * かつファイル単位なので、分担していると先に走ったファイルの時点では
   * まだ証明されていない Behavior が残る。全体の判定は断片を合流した後
   * (`doc.ts`) に移り、ここでは証明済みの分だけを書き出す。
   */
  readonly partial?: boolean;
}

export function createEvidence(runner: Runner): EvidenceApi {
  let current: { intentId: string; behaviorId: string } | null = null;
  /**
   * いま走っているテストの印。タイムアウトで打ち切られたテストの `fn()` が
   * 遅れて解決したとき、印が入れ替わっているので「通った」と数えずに済む
   */
  let running: object | null = null;
  /**
   * 非 partial の `report()` を済ませた Intent。その後ろに `describeBehavior` が
   * 並ぶと、「不要な waived()」の判定が済んだ後で証明が付き、免除の自壊が
   * 素通りする (実測 2026-09-14)。順序の約束を人が守るのではなく、破ったら落とす
   */
  const reported = new Set<string>();

  function describeBehavior<I extends Intent>(
    impl: Implementation<I>,
    id: BehaviorId<I>,
    body: () => void
  ): void {
    const found = impl.intent.behaviors.find((b) => b.id === id);
    if (found === undefined) {
      throw new Error(`宣言されていない Behavior: ${id}`);
    }
    if (reported.has(impl.intent.id)) {
      throw new Error(
        `report() の後ろに describeBehavior は置けない: ${id}。report() はファイル末尾で 1 回`
      );
    }

    runner.describe(`${found.id}: ${found.description}`, () => {
      // §11.5 Behavior Coupling: Behavior は Intent の直下に並ぶ。入れ子にしない
      if (current !== null) {
        throw new Error(
          `describeBehavior は入れ子にしない: ${current.behaviorId} の中の ${id}`
        );
      }
      current = { intentId: impl.intent.id, behaviorId: id };
      body();
      current = null;
    });
  }

  /** Behavior を証明する 1 件。`test` と同じだが、結果が Evidence になる */
  function proves(
    name: string,
    fn: () => void | Promise<unknown>,
    timeout?: number
  ): void {
    if (current === null) {
      throw new Error(`proves() は describeBehavior の中でだけ使う: ${name}`);
    }
    const at = current;
    // 走らずに終わった場合に 'declared' のまま残るよう、収集時にも書いておく
    recordEvidence(at.intentId, at.behaviorId, name, 'declared');
    const wrapped = async () => {
      const token = {};
      running = token;
      // ランナーのタイムアウトは try/catch に届かない (実測)。同じ期限で
      // 自分でも打ち切りを記録し、遅れて解決した fn() に上書きさせない。
      // ランナー側の計測はこれより先に始まっているので、こちらが先に
      // 鳴って通ったテストを落とすことはない
      const deadline =
        timeout === undefined
          ? undefined
          : setTimeout(() => {
              recordEvidence(at.intentId, at.behaviorId, name, 'failed');
            }, timeout);
      try {
        await fn();
      } catch (error) {
        clearTimeout(deadline);
        recordEvidence(at.intentId, at.behaviorId, name, 'failed');
        throw error;
      }
      clearTimeout(deadline);
      // timeout を渡していない場合はランナーの既定値が分からない。印が
      // 入れ替わっていれば、打ち切られた後に解決したと分かる
      if (running !== token) {
        recordEvidence(at.intentId, at.behaviorId, name, 'failed');
        return;
      }
      recordEvidence(at.intentId, at.behaviorId, name, 'passed');
    };
    if (timeout === undefined) runner.test(name, wrapped);
    else runner.test(name, wrapped, timeout);
  }

  /**
   * ファイルの末尾で 1 回呼ぶ。3 つやる:
   *
   * - 通った Evidence を持たない Behavior があればテストとして落とす
   *   (`partial` を渡した場合はここでは見ず、doc.ts の合流後に見る)
   * - 証明しないと決めたのに証明できている Behavior があれば落とす
   * - Graph と Evidence を `.decopin-intent/` へ書き出す (doc.ts が読む)
   *
   * Evidence の記録はプロセス内なので、集約はファイル単位の断片で行う。
   */
  function report(impl: Implementation, options?: ReportOptions): void {
    if (options?.partial !== true) {
      if (reported.has(impl.intent.id)) {
        throw new Error(`report() は 1 回だけ: ${impl.intent.id}`);
      }
      reported.add(impl.intent.id);
      runner.test(`${impl.intent.id}: 全 Behavior が証明されている`, () => {
        const left = unproven(toReport(impl));
        // 落ちたら、Behavior を消すか、証明する proves() を書く
        if (left.length > 0) {
          throw new Error(`証明されていない Behavior: ${left.join(', ')}`);
        }
      });
    }

    // 免除が不要になったことを検知する。外させるためのテスト
    runner.test(`${impl.intent.id}: 不要な waived() が残っていない`, () => {
      const stale = waivedButProven(toReport(impl));
      if (stale.length > 0) {
        throw new Error(
          `証明できているので waived() を外す: ${stale.join(', ')}`
        );
      }
    });

    runner.afterAll(async () => {
      const shard = toReport(impl);
      await mkdir(SHARD_DIR, { recursive: true });
      await writeFile(
        join(SHARD_DIR, shardName(shard)),
        `${JSON.stringify(shard, null, 2)}\n`
      );
    });
  }

  return { describeBehavior, proves, report };
}

/**
 * 断片のファイル名。中身の fingerprint は分けるためだけの短い印。
 * 同じ Intent を複数のテストファイルが証明しても上書きし合わないようにする。
 *
 * **印には Behavior id を含める**。証明名だけだと、別の Behavior を
 * 同じ証明名で分担した 2 ファイルが同じファイル名になる。同一プロセスなら
 * impl に累積されるので気づかないが、プロセスを分けて並列に走らせると
 * 後勝ちで片方の証明が消える (実測 2026-09-20)。doc.ts は未証明として
 * 落ちるので安全側には倒れるが、テストは全部通っているのに落ちるので
 * 原因が読めない。id を含めれば衝突しないし、同じ分担なら同じ名前 (冪等) のまま。
 */
export function shardName(report: IntentReport): string {
  const proved = report.behaviors.flatMap((b) =>
    b.evidence.map((e) => `${b.id}/${e.name}`)
  );
  return `${report.id}.${fingerprint(proved)}.json`;
}

function fingerprint(names: readonly string[]): string {
  let hash = 2166136261;
  for (const char of names.join('\0')) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
