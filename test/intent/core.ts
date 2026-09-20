/**
 * Intent-First Development の最小ランタイム (実験)。
 *
 * intent.txt の §9 に従い、型で守るのは **Artifact 間の構造** だけにする。
 * Behavior の中身 (引数・戻り値・状態・副作用) は普通の TypeScript に任せる。
 *
 * ここが守るのは 3 本:
 *
 * - Intent ↔ Behavior — Behavior を 1 つも持たない Intent を作れない (§11.3)
 * - Behavior ↔ Function — `implement()` の引数が Behavior の全 id を要求する。
 *   足りなければ型検査が落ち、宣言していない id を書いても落ちる (§11.6)
 * - Behavior ↔ Test — Evidence の記録先。`evidence.ts` が書き込む (§10)
 *
 * テストランナーにも fs にも依存しない (§19 で未決のため)。bun:test との接続は
 * `evidence.ts` / `evidence.bun.ts` に分けてある。
 */

/** 検証可能な振る舞い。Intent を特定の文脈で具体化したもの */
export interface Behavior<Id extends string = string> {
  readonly id: Id;
  readonly description: string;
  /**
   * 証明しないと決めた理由。`waived()` でだけ付く。
   * 付いている間、この Behavior は証明を要求されない
   */
  readonly waiver?: string;
}

export function behavior<const Id extends string>(
  id: Id,
  description: string
): Behavior<Id> {
  return { id, description };
}

/**
 * 「存在は分かっているが、証明しないと決めた」Behavior。
 *
 * 書かなければ Intent Graph から消えるだけで、**沈黙は記録に残らない**。
 * ここで宣言すると、ドキュメントに理由つきで残り続ける (欠落を負債として出す)。
 *
 * TypeScript の `as` に近い。機械は確かめず、**責任は人間側**にある。
 * `unknown` (まだ証明していない) とは別物なので、記号も分けてある。
 *
 * 抜け穴が永久に残らないよう、**通った Evidence が付いたらエラーになる**
 * (`waivedButProven`)。`@ts-expect-error` と同じで、不要になれば自分で落ちる。
 */
export function waived<const Id extends string>(
  id: Id,
  description: string,
  why: string
): Behavior<Id> {
  if (why.trim() === '') {
    throw new Error(`証明しない理由が要る: ${id}`);
  }
  return { id, description, waiver: why };
}

/** 目的。人が書き、人が所有する。機械解釈は目的にしない (§2) */
export interface Intent<
  Id extends string = string,
  B extends readonly Behavior[] = readonly Behavior[],
> {
  readonly id: Id;
  readonly purpose: string;
  readonly behaviors: B;
}

/**
 * どの Behavior id をどの Intent が宣言したか。§5.1 の所有者の一意性を見張る。
 *
 * 同じ id を 2 つの Intent が使うと、waiver がどちらの都合で付いたのか、
 * Intent を消したときに Behavior を消してよいのかが決まらなくなる。
 */
const OWNER = new Map<string, string>();

export function intent<
  const Id extends string,
  const B extends readonly Behavior[],
>(spec: Intent<Id, B>): Intent<Id, B> {
  // §11.3 Behaviorless Intent: 検証可能な単位に落ちていない Intent は作らせない
  if (spec.behaviors.length === 0) {
    throw new Error(`Behaviorless Intent: ${spec.id} に Behavior がない`);
  }
  const ids = spec.behaviors.map((b) => b.id);
  const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicated.length > 0) {
    throw new Error(`Behavior id が重複している: ${duplicated.join(', ')}`);
  }
  for (const id of ids) {
    const owner = OWNER.get(id);
    // 同じ Intent の再評価 (モジュールが二度読まれる) は素通しでよい
    if (owner !== undefined && owner !== spec.id) {
      throw new Error(
        `Behavior は共有できない (§5.1): ${id} は ${owner} のもの。` +
          `${spec.id} の文脈で言い直すこと`
      );
    }
    OWNER.set(id, spec.id);
  }
  return spec;
}

/** その Intent が持つ Behavior の id の union */
export type BehaviorId<I extends Intent> = I['behaviors'][number]['id'];

/** Behavior を担っている実装への参照 */
export interface Carrier {
  /**
   * 実体そのもの。パスや名前の文字列ではなく値を持つので、消したり
   * 名前を変えたりすれば型検査が落ちる (§11.10 Intent Theater への歯止め)。
   *
   * **関数とは限らない。** 雛形の表のような定数が Behavior を担うことがある
   * (実験 2 `gen` の `FILE_TEMPLATES`)。効いているのは「値への参照を持つ」
   * ことだけで、呼べることは一度も使っていなかった
   */
  readonly value: object;
  /** doc に出す名前。値が name を持つなら実体から取る。無ければ手で書く */
  readonly name: string;
  /** どのファイルにあるか。doc の生成用。実在はテストが見張る */
  readonly where: string;
}

export function carriedBy(
  named: { readonly name: string },
  where: string
): Carrier;
export function carriedBy(value: object, where: string, name: string): Carrier;
export function carriedBy(
  value: object,
  where: string,
  name?: string
): Carrier {
  // 関数・クラスは name を持つ。持たない定数だけ第 3 引数で補う。
  // 無名関数を素通りさせない — doc に空の名前が並ぶと担い手を追えなくなる
  const own = (value as { name?: unknown }).name;
  const resolved = name ?? (typeof own === 'string' ? own : '');
  if (resolved === '') {
    throw new Error(`Carrier の名前が要る: ${where}`);
  }
  return { value, name: resolved, where };
}

export interface Implementation<I extends Intent = Intent> {
  readonly intent: I;
  readonly carriers: Readonly<Record<string, readonly Carrier[]>>;
}

/**
 * Behavior と Function を結びつける。intent.txt §8.2 の証明分離パターン:
 * 実装は普通の TypeScript のままで、ここは「どれがどれを担うか」だけを言う。
 *
 * 引数の型が全 Behavior id を要求するので、Behavior を足して実装を結ばないと
 * 型検査が落ちる。
 */
export function implement<I extends Intent>(
  of: I,
  carriers: { readonly [K in BehaviorId<I>]: readonly Carrier[] }
): Implementation<I> {
  return { intent: of, carriers };
}

/**
 * §8.1 一方向パターン。**Behavior を通した値を、そのまま実装として使う。**
 *
 * `implement()` (§8.2) との違いは表の置き場所だけで、Intent Graph は同じ
 * (§8.3)。8.2 は「実装 → それを指す表」、こちらは「宣言しながら実装を通す」。
 *
 * 代償が 1 つある。**全 Behavior が担われていることを型で要求できない。**
 * `implement()` は引数が全 id を要求するので型検査が落ちるが、こちらは
 * 呼ばれた分しか集まらないので、欠けは `collect()` の実行時エラーになる。
 */
export function carries<V extends object, I extends Intent>(
  of: I,
  ids: readonly BehaviorId<I>[],
  value: V,
  where: string,
  name?: string
): V {
  if (ids.length === 0) {
    throw new Error(`担う Behavior が要る: ${where}`);
  }
  const carrier = carriedBy(value as { name: string }, where, name as string);
  const slots = REGISTERED.get(of.id) ?? new Map<string, Carrier[]>();
  for (const id of ids) {
    const found = of.behaviors.find((b) => b.id === id);
    if (found === undefined) {
      throw new Error(`宣言されていない Behavior: ${id}`);
    }
    slots.set(id, [...(slots.get(id) ?? []), carrier]);
  }
  REGISTERED.set(of.id, slots);
  return value;
}

/** `carries()` が集めた対応。Intent id → Behavior id → Carrier */
const REGISTERED = new Map<string, Map<string, Carrier[]>>();

/**
 * `carries()` で集めた対応を Implementation にする (§8.1 側の締め)。
 *
 * `implement()` が型検査で見ていた「全 Behavior が担われている」を、
 * ここで実行時に見る。**モジュールが読み込まれていないと集まらない**ので、
 * 呼ぶ側が実装を import 済みであることに依存する
 */
export function collect<I extends Intent>(of: I): Implementation<I> {
  const slots = REGISTERED.get(of.id) ?? new Map<string, Carrier[]>();
  const missing = of.behaviors
    .filter((b) => b.waiver === undefined && !slots.has(b.id))
    .map((b) => b.id);
  if (missing.length > 0) {
    throw new Error(
      `担い手のいない Behavior: ${missing.join(', ')}。` +
        `carries() を書くか、実装を import すること`
    );
  }
  const carriers: Record<string, readonly Carrier[]> = {};
  for (const b of of.behaviors) carriers[b.id] = slots.get(b.id) ?? [];
  return { intent: of, carriers };
}

/**
 * Evidence の状態。
 *
 * `declared` は「テストとして登録されたが、まだ結果が返っていない」。
 * 走らずに終わった (絞り込み実行・別のテストで落ちて中断) ものはここに残る。
 * **`passed` だけが証明**で、それ以外は §11.7 False Verification 側に数える。
 */
export type EvidenceStatus = 'declared' | 'passed' | 'failed';

export interface Evidence {
  readonly name: string;
  readonly status: EvidenceStatus;
}

/** Behavior ごとの Evidence。evidence.ts が書き込む */
const EVIDENCE = new Map<string, Map<string, EvidenceStatus>>();

function key(intentId: string, behaviorId: string): string {
  return `${intentId}/${behaviorId}`;
}

function slot(
  intentId: string,
  behaviorId: string
): Map<string, EvidenceStatus> {
  const found = EVIDENCE.get(key(intentId, behaviorId));
  if (found !== undefined) return found;
  const created = new Map<string, EvidenceStatus>();
  EVIDENCE.set(key(intentId, behaviorId), created);
  return created;
}

/**
 * Evidence を記録する。**確定した結果 (`passed` / `failed`) は動かない。**
 *
 * 一方向にしてあるのは、テストランナーが打ち切った後に `fn()` が遅れて
 * 解決することがあるから。タイムアウトで落ちたテストの `passed` が後から
 * 上書きすると、落ちているのに ✓ が出る (§11.7 False Verification)。
 */
export function recordEvidence(
  intentId: string,
  behaviorId: string,
  name: string,
  status: EvidenceStatus
): void {
  const slots = slot(intentId, behaviorId);
  const current = slots.get(name);
  if (current === 'passed' || current === 'failed') return;
  slots.set(name, status);
}

export function evidenceOf(
  intentId: string,
  behaviorId: string
): readonly Evidence[] {
  return [...slot(intentId, behaviorId)].map(([name, status]) => ({
    name,
    status,
  }));
}

/**
 * Intent Graph と、いまプロセスが知っている Evidence を 1 つの値にする。
 * JSON にしてファイルへ吐けるよう、関数への参照は名前に落とす。
 */
export interface IntentReport {
  readonly id: string;
  readonly purpose: string;
  readonly behaviors: readonly {
    readonly id: string;
    readonly description: string;
    readonly waiver?: string;
    readonly carriers: readonly {
      readonly name: string;
      readonly where: string;
    }[];
    readonly evidence: readonly Evidence[];
  }[];
}

export function toReport(impl: Implementation): IntentReport {
  return {
    id: impl.intent.id,
    purpose: impl.intent.purpose,
    behaviors: impl.intent.behaviors.map((b) => ({
      id: b.id,
      description: b.description,
      ...(b.waiver === undefined ? {} : { waiver: b.waiver }),
      carriers: (impl.carriers[b.id] ?? []).map((c) => ({
        name: c.name,
        where: c.where,
      })),
      evidence: evidenceOf(impl.intent.id, b.id),
    })),
  };
}

/**
 * 同じ Intent の report を 1 つにする。1 つの Intent が複数のテストファイルに
 * 跨るときに使う。`failed` は他のどの状態にも上書きされない。
 */
export function mergeReports(a: IntentReport, b: IntentReport): IntentReport {
  if (a.id !== b.id) {
    throw new Error(`別の Intent は合流できない: ${a.id} と ${b.id}`);
  }
  const behaviors = new Map(a.behaviors.map((x) => [x.id, x]));
  for (const right of b.behaviors) {
    const left = behaviors.get(right.id);
    if (left === undefined) {
      behaviors.set(right.id, right);
      continue;
    }
    const evidence = new Map(left.evidence.map((e) => [e.name, e.status]));
    for (const e of right.evidence) {
      if (evidence.get(e.name) === 'failed') continue;
      evidence.set(e.name, e.status);
    }
    behaviors.set(right.id, {
      ...left,
      carriers: left.carriers.length > 0 ? left.carriers : right.carriers,
      evidence: [...evidence].map(([name, status]) => ({ name, status })),
    });
  }
  return { ...a, behaviors: [...behaviors.values()] };
}

/** 1 つの実装が担っている Behavior の在処 */
export interface CarrierUse {
  readonly intent: string;
  readonly behavior: string;
}

/** 複数の Intent から担われている実装 1 つ分 */
export interface SharedCarrier {
  readonly name: string;
  readonly where: string;
  readonly by: readonly CarrierUse[];
}

/**
 * 複数の Intent にまたがって担い手になっている実装を挙げる (§11.8)。
 *
 * **これは違反の検出ではない。** 1 つの実装が複数の目的を担うのは正常で、
 * 実験 2 の `writeTemplates` (init と gen) がその例。重複を疑うべきなのは
 * purpose が同じ目的を指しているときだけで、そこは自然言語なので機械は
 * 判定できない。ここがやるのは**重なりを漏らさず出すところまで**。
 */
export function sharedCarriers(
  reports: readonly IntentReport[]
): SharedCarrier[] {
  const seen = new Map<string, SharedCarrier & { by: CarrierUse[] }>();
  for (const report of reports) {
    for (const b of report.behaviors) {
      for (const c of b.carriers) {
        // JSON の断片を跨ぐので、実体ではなく名前と場所で同一性を見る
        const id = `${c.where}#${c.name}`;
        const found = seen.get(id);
        const use = { intent: report.id, behavior: b.id };
        if (found === undefined) {
          seen.set(id, { name: c.name, where: c.where, by: [use] });
          continue;
        }
        found.by.push(use);
      }
    }
  }
  return [...seen.values()].filter(
    (s) => new Set(s.by.map((u) => u.intent)).size > 1
  );
}

/**
 * 証明されていない Behavior の id。
 *
 * 「通った Evidence が 1 つ以上あり、落ちた Evidence が 1 つも無い」ことを
 * 証明とする。落ちた証明が混ざったまま ✓ を名乗るのは §11.7 そのものなので、
 * 他に通ったものがあっても証明とは呼ばない。
 *
 * `waived()` した Behavior は、証明しないと決めたものなので数えない。
 * 代わりに `waivedButProven()` が逆向きに見張る。
 */
export function unproven(report: IntentReport): string[] {
  return report.behaviors
    .filter((b) => b.waiver === undefined)
    .filter(
      (b) =>
        !b.evidence.some((e) => e.status === 'passed') ||
        b.evidence.some((e) => e.status === 'failed')
    )
    .map((b) => b.id);
}

/**
 * 証明しないと決めたのに、通った Evidence が付いている Behavior の id。
 *
 * 抜け穴を自壊させる仕掛け。`@ts-expect-error` がエラーの消滅で落ちるのと同じで、
 * 証明できるようになった時点で `waived()` を外させる。これが無いと、一度付いた
 * 免除は誰も外しに来ず、`any` と同じように永久に残る。
 */
export function waivedButProven(report: IntentReport): string[] {
  return report.behaviors
    .filter((b) => b.waiver !== undefined)
    .filter((b) => b.evidence.some((e) => e.status === 'passed'))
    .map((b) => b.id);
}

const MARK: Record<EvidenceStatus, string> = {
  // 登録されたが結果が返っていない。証拠が無いこと (?) とは別
  declared: '!',
  passed: '✓',
  failed: '✗',
};

/**
 * Behavior の状態。`?` と `!` と `–` を混ぜない (扱いが違うため)。
 *
 * - `✓` 通った Evidence があり、落ちたものが無い
 * - `✗` 落ちた Evidence がある
 * - `–` 証明しないと決めた (理由つき)。TypeScript の `as` に相当
 * - `?` Evidence が 1 つも無い。まだ証明を書いていない。`unknown` に相当
 * - `!` Evidence はあるが結果が返っていない。絞り込み実行や中断
 */
function markOf(b: IntentReport['behaviors'][number]): string {
  if (b.evidence.some((e) => e.status === 'failed')) return '✗';
  if (b.evidence.some((e) => e.status === 'passed')) return '✓';
  if (b.waiver !== undefined) return '–';
  return b.evidence.length === 0 ? '?' : '!';
}

/**
 * Intent Graph からドキュメントを組み立てる (§15)。
 * 手で書く文書ではないので、ずれようがない。
 */
export function toDocument(report: IntentReport): string {
  const lines = [
    `Intent: ${report.id}`,
    'Purpose:',
    `  ${report.purpose}`,
    'Behaviors:',
  ];
  for (const b of report.behaviors) {
    lines.push(`  ${markOf(b)} ${b.id} — ${b.description}`);
    if (b.waiver !== undefined) {
      lines.push(`      証明しない: ${b.waiver}`);
    }
    for (const e of b.evidence) {
      lines.push(`      Evidence ${MARK[e.status]} ${e.name}`);
    }
    for (const c of b.carriers) {
      lines.push(`      Implementation: ${c.name} (${c.where})`);
    }
  }
  return `${lines.join('\n')}\n`;
}
