/**
 * `decopin init` の Behavior。
 *
 * 粒度の方針 (§18 Question B): 「利用者が観測できる結末」まで。
 * `writeFile` に `wx` を渡すといった実装の詳細は Behavior にしない
 * (§11.4 Behavior Explosion)。逆に「初期化がうまくいく」まで粗いと
 * テストが書けないので、失敗の仕方ごとに 1 つずつ分けてある。
 */
import { behavior, waived } from '../core.ts';

/** 雛形に何も足さずに、ビルドから実行まで通ること */
export const RUNS_FROM_SCRATCH = behavior(
  'runs-from-scratch',
  '生成した雛形だけで build が通り、dist/index.js hello が挨拶する'
);

/** 生成した tsconfig.json が、そのまま型検査を通ること */
export const TYPECHECKS_AS_GENERATED = behavior(
  'typechecks-as-generated',
  '生成した tsconfig.json で tsc --noEmit が通る'
);

/** 途中で止めても、既存プロジェクトで打っても、消えるものが無いこと */
export const NEVER_OVERWRITES = behavior(
  'never-overwrites',
  '既にあるファイルは書き換えず、残したものとして報告する'
);

/** 「次に何を打てばよいか」で終わること */
export const TELLS_THE_NEXT_STEP = behavior(
  'tells-the-next-step',
  '書いたファイルと、次に打つコマンドを順に出す'
);

/**
 * 依存を実際に入れること。
 *
 * ここは証明しない。`bun add` を走らせる以上、証拠がネットワークとレジストリの
 * 状態に左右され、テストの中で settle しない。**書かなければ Intent Graph から
 * 消えるだけ**なので、理由つきで残す方を選んだ。
 */
export const INSTALLS_DEPENDENCIES = waived(
  'installs-dependencies',
  '--no-install でなければ、decopin-cli と @types/bun を実際に入れる',
  'bun add がネットワークとレジストリに依存するため、テストの中で証拠が確定しない'
);

export const BEHAVIORS = [
  RUNS_FROM_SCRATCH,
  TYPECHECKS_AS_GENERATED,
  NEVER_OVERWRITES,
  TELLS_THE_NEXT_STEP,
  INSTALLS_DEPENDENCIES,
] as const;
