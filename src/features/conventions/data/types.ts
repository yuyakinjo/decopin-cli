/**
 * JSON で往復できる形 (ADR 27)。
 *
 * `--json` は `JSON.stringify` を通るので、関数と `Map` は**黙って消え**、
 * `NaN` は `null` になり、`bigint` は実行時に落ちる。`Date` / `Temporal` は
 * 型と違う文字列になる。実行するまで気づけないので、`--json` の直前に見る。
 *
 * この型は利用者が自分で `satisfies JsonValue` と書きたいときのために出す。
 * **型検査に頼り切らない**のは、生成した `.d.ts` に検査を埋めても
 * `skipLibCheck: true` (よくある設定) で黙って消えるため。実測で確認済み。
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };
