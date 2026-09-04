/**
 * 非推奨にしたものと、その削除期限 (ADR 20)。
 *
 * 破壊的変更はいきなり出さない。後方互換を保ったまま非推奨にし、移行の手順を
 * 示し、**1 年後**に削除する。期限は test/docs/deprecations.test.ts が見張って
 * いて、過ぎるとテストが落ちる。忘れたまま残り続けることがない
 */
export interface Deprecation {
  /**
   * `what` の探し方。
   *
   * - `source`: ファイルの中身をこの文字列で部分一致検索する (`Type.Date` など)
   * - `filename`: 規約ファイルの旧名。scan がファイル名で見つける (`command.tsx`)
   */
  kind: 'source' | 'filename';
  /** 何が非推奨になったか */
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
    kind: 'source',
    what: 'Type.Date',
    since: '2026-08-29',
    removeAfter: '2027-08-29',
    migration:
      'use <Type.Instant/> for a moment (2026-08-28T14:30:00Z) or <Type.PlainDate/> for a calendar day (2026-08-28)',
  },
  {
    kind: 'filename',
    what: 'command.tsx',
    since: '2026-09-02',
    removeAfter: '2027-09-02',
    migration: 'replace command.tsx with cmd.tsx (command.ts with cmd.ts)',
  },
  // エラーの印を 1 つのシンボルに揃えた (ADR 42)。旧い印は付け続け、見続ける
  {
    kind: 'source',
    what: "Symbol.for('decopin.CliError')",
    since: '2026-09-04',
    removeAfter: '2027-09-04',
    migration:
      "use Symbol.for('decopin.error') with the value 'CliError' (or isCliError())",
  },
  {
    kind: 'source',
    what: "Symbol.for('decopin.DeclarationError')",
    since: '2026-09-04',
    removeAfter: '2027-09-04',
    migration:
      "use Symbol.for('decopin.error') with the value 'DeclarationError' (or isDeclarationError())",
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
