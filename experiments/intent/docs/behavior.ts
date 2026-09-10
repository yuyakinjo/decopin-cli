/**
 * `decopin docs` の Behavior。**実装より先に書いた** (§12 Intent-First)。
 *
 * これまでの 5 つは既存コードから Intent を起こす Intent Recovery だった。
 * ここが初めて、書く前に Behavior を決める側になる。
 *
 * 始める前の予想を残しておく (後で外れを数えるため):
 *
 * - 実装しながら Behavior を書き換えたくなる回数は、Intent Recovery より多い
 * - waived() は 0 個。生成物も実行結果も、テストの中で確定できるはず
 *
 * 粒度は gen と同じ基準 (§18 Question B):「利用者が観測できる結末」で割り、
 * 失敗の仕方が違えば別の Behavior にする。
 */
import { behavior } from '../core.ts';

/** どんなコマンドがあるかを、app/ を歩かなくても一望できること */
export const LISTS_EVERY_COMMAND = behavior(
  'lists-every-command',
  'app/ にあるコマンドを漏らさず、入れ子は階層のまま、名前と説明で並べる'
);

/** 打つときの形が分かること。help を 1 コマンドずつ叩かなくて済む */
export const SHOWS_HOW_TO_CALL = behavior(
  'shows-how-to-call',
  '引数とオプションを、必須か・型・既定値つきで、そのまま打てる形で見せる'
);

/**
 * 「押したら結果が返る」の核。**打たなくても何が返るかが分かる**。
 * 例は人が example.tsx に宣言し、docs はそれを実際に走らせる
 */
export const RUNS_THE_DECLARED_EXAMPLES = behavior(
  'runs-the-declared-examples',
  'example.tsx を置いたコマンドは実際に実行し、打った行と返ってきた出力を並べて載せる'
);

/**
 * ドキュメントを作るだけで副作用が起きないこと。
 *
 * 実行するドキュメントの安全弁。宣言のないコマンドまで走らせると、
 * 「読むつもりでファイルを消した」が起きる
 */
export const ONLY_RUNS_WHAT_WAS_DECLARED = behavior(
  'only-runs-what-was-declared',
  '例が宣言されていないコマンドは実行せず、使い方だけを載せる'
);

/**
 * 失敗した例を成功に見せないこと (§11.7 と同じ形の穴)。
 *
 * 生成を止めないのは、1 つの例の失敗で全体が出なくなると、
 * 失敗を消す方が早くなってしまうから
 */
export const SHOWS_A_FAILURE_AS_A_FAILURE = behavior(
  'shows-a-failure-as-a-failure',
  '例が失敗しても生成は止めず、終了コードと出力をそのまま失敗として載せる'
);

/** 生成物の置き場を使う側が決められること */
export const WRITES_WHERE_TOLD = behavior(
  'writes-where-told',
  '既定は標準出力に出し、--out を渡したときだけそのファイルに書く'
);

export const BEHAVIORS = [
  LISTS_EVERY_COMMAND,
  SHOWS_HOW_TO_CALL,
  RUNS_THE_DECLARED_EXAMPLES,
  ONLY_RUNS_WHAT_WAS_DECLARED,
  SHOWS_A_FAILURE_AS_A_FAILURE,
  WRITES_WHERE_TOLD,
] as const;
