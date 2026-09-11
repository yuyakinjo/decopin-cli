/**
 * 宣言ファイルの返り値型の Behavior。**実装より先に書いた** (§12 Intent-First)。
 *
 * 実験 5 に続く 2 つ目の Intent-First。違いは**当て方**で、今回は §8.1 の
 * 一方向パターン (`carries()` が Behavior を通した関数を返し、それを実装
 * として使う) を試す。Question C と E がこの実験の目的。
 *
 * 始める前の予想:
 *
 * - 一方向パターンは成立しない。`src/` は公開ライブラリで、`carries()` を
 *   呼ぶと Intent ランタイムが配布物に入る。**測って確かめる** (assert しない)
 * - waived() は 1 つ出る。「型検査が落ちる」ことの証明は、型検査を子プロセスで
 *   回さないと書けない。費用を見てから決める
 *
 * 粒度は §18 Question B の基準:「利用者が観測できる結末」で割る。
 * 型検査が落ちるのか、落ちないのか、ソースが書き換わるのかで分けた。
 */
import { behavior } from '../core.ts';

/** 宣言ファイルが何を返すべきかが、型として公開されていること */
export const DECLARES_WHAT_EACH_FILE_RETURNS = behavior(
  'declares-what-each-file-returns',
  'argv/stdin/output/env/version/shell の宣言ファイルに返り値型があり、要素でないもの (null・文字列) を返すと型検査が落ちる'
);

/**
 * ADR 28「output.tsx があれば宣言が正」を、型でも効かせること。
 *
 * ここだけは JSX を経由しないので、ADR 9 の「型引数を運べない」に縛られない
 */
export const TIES_DATA_TO_OUTPUT = behavior(
  'ties-data-to-output',
  'output.tsx があるコマンドの data.tsx が宣言と食い違う値を返すと、実行前に型検査が落ちる'
);

/**
 * 型が未生成でも止まらないこと (ADR 9 の代償の扱いを踏襲)。
 *
 * `decopin dev` を回していない人の手元で型検査が落ちると、
 * 注釈を消す方が早くなってしまう
 */
export const FALLS_BACK_BEFORE_GENERATION = behavior(
  'falls-back-before-generation',
  '.decopin/types.d.ts が無い状態では DataResult は緩い型になり、型検査を止めない'
);

/** 注釈を手で書かなくてよいこと (ADR 44 と同じ約束を宣言ファイルへ広げる) */
export const ANNOTATES_WHILE_DEVELOPING = behavior(
  'annotates-while-developing',
  'dev --annotate が、注釈の無い宣言ファイルの default export に返り値型と import を書き足す'
);

/** 書き換えが広がらないこと。人のソースを触る機能の安全弁 */
export const NEVER_TOUCHES_ANNOTATED_FILES = behavior(
  'never-touches-annotated-files',
  '既に返り値型があるファイルと、対象外のファイルは 1 バイトも変えない'
);

/**
 * data.tsx の注釈は output.tsx があるときだけ。
 *
 * 無いときの `data` の型は data.tsx の戻り値から `ReturnType` で引いている
 * (ADR 25)。そこへ返り値型を書くと型が自己参照する
 */
export const ANNOTATES_DATA_ONLY_WHEN_DECLARED = behavior(
  'annotates-data-only-when-declared',
  'output.tsx が無いコマンドの data.tsx には返り値型を書かない'
);

export const BEHAVIORS = [
  DECLARES_WHAT_EACH_FILE_RETURNS,
  TIES_DATA_TO_OUTPUT,
  FALLS_BACK_BEFORE_GENERATION,
  ANNOTATES_WHILE_DEVELOPING,
  NEVER_TOUCHES_ANNOTATED_FILES,
  ANNOTATES_DATA_ONLY_WHEN_DECLARED,
] as const;
