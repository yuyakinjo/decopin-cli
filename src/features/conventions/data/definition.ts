import type { RouteName } from '../cmd/types.ts';

export const FILE_NAME = 'data' as const;

/**
 * 生成された `.decopin/types.d.ts` が埋める、`output.tsx` から決まる形。
 *
 * {@link Routes} と分けてあるのは自己参照を避けるため。`output.tsx` が無い
 * コマンドの `data` は data.tsx の戻り値から `ReturnType` で引いている
 * (ADR 25) ので、そこへ返り値型を書くと型が自分を参照する。ここには
 * **`output.tsx` があるコマンドだけ**が並ぶ。
 */
export interface DataResults {}

/**
 * `data.tsx` の返り値。`output.tsx` で宣言した形になる (ADR 28)。
 *
 * ```tsx
 * export default function Data({ options }: CmdProps<'stats'>): DataResult<'stats'> {}
 * ```
 *
 * `output.tsx` が無いコマンドと、型がまだ生成されていない状態では `unknown`
 * に落ちる。**注釈が型検査を止めない**ようにするためで、代わりに
 * 何も守らない (ADR 9 の代償と同じ扱い)。
 */
export type DataResult<N extends RouteName> = N extends keyof DataResults
  ? DataResults[N]
  : unknown;
