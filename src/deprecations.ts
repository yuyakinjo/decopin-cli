/**
 * 非推奨にしたものと、その削除期限 (ADR 20)。
 *
 * 破壊的変更はいきなり出さない。後方互換を保ったまま非推奨にし、移行の手順を
 * 示し、**1 年後**に削除する。期限は test/docs/deprecations.test.ts が見張って
 * いて、過ぎるとテストが落ちる。忘れたまま残り続けることがない
 */
export interface Deprecation {
  /** 何が非推奨になったか。ビルド時にソースをこの文字列で探す */
  what: string;
  /** 非推奨にした日 (UTC) */
  since: string;
  /** この日を過ぎたら削除する (UTC)。`since` の 1 年後 */
  removeAfter: string;
  /** 何に置き換えるか。1 行で言い切る */
  migration: string;
}

export const DEPRECATIONS: readonly Deprecation[] = [
  {
    what: 'Type.Date',
    since: '2026-08-29',
    removeAfter: '2027-08-29',
    migration:
      'use <Type.Instant/> for a moment (2026-08-28T14:30:00Z) or <Type.PlainDate/> for a calendar day (2026-08-28)',
  },
];

/** 削除期限を過ぎているもの。期限当日はまだ残してよい */
export function overdue(
  today: Temporal.PlainDate,
  deprecations: readonly Deprecation[] = DEPRECATIONS
): Deprecation[] {
  return deprecations.filter(
    (d) =>
      Temporal.PlainDate.compare(
        today,
        Temporal.PlainDate.from(d.removeAfter)
      ) > 0
  );
}
