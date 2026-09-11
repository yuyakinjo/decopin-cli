/**
 * `decopin build` の Behavior。
 *
 * init は 4+1、gen は 6、ここは 5。**元のテストが証明していたのは 3 つだけ**で、
 * 残り 2 つ (reports-what-it-wrote / reports-reachable-effects) は
 * src/cli/build/cmd.ts の出力を誰も見ていなかった Hidden Behavior (§11.6)。
 * init の tells-the-next-step と同じ形が、より大きな規模で出た。
 *
 * 生成物が**実行できる**ことは、ここではなく Intent run-commands-as-declared
 * の側で証明する。build の Behavior は「何を出したか」まで。
 */
import { behavior } from '../core.ts';

export const PRODUCES_ONE_RUNNABLE_FILE = behavior(
  'produces-one-runnable-file',
  '出力は 1 ファイルで、shebang と実行権限が付いていてそのまま起動できる'
);

export const NAMES_COMMANDS_AFTER_DIRECTORIES = behavior(
  'names-commands-after-directories',
  'app/ のディレクトリ構成がそのままコマンド名になり、入れ子は / で繋がる'
);

export const REFUSES_AN_APP_WITHOUT_COMMANDS = behavior(
  'refuses-an-app-without-commands',
  'cmd が 1 つも無ければ、どこに何を置けばよいかを言って止まる'
);

export const REPORTS_WHAT_IT_WROTE = behavior(
  'reports-what-it-wrote',
  '見つけたコマンドと、書いた生成物の場所を漏らさず出す'
);

/**
 * 出力を「打つ側から見た単位」で並べる。**後から足した Behavior** で、
 * きっかけは Next.js の build が出す Route 一覧を見た利用者の要望。
 *
 * 一覧に名前しか出さないと、そのコマンドが何から組み立っているのか
 * (argv.tsx があるのか、上の layout.tsx が効いているのか) は app/ を
 * 開き直さないと分からない
 */
export const SHOWS_WHAT_EACH_COMMAND_IS_MADE_OF = behavior(
  'shows-what-each-command-is-made-of',
  'コマンドごとに、そこに置かれた規約ファイルと、上のディレクトリから効いている継承ファイルを、どこの階層のものかまで出す'
);

export const REPORTS_REACHABLE_EFFECTS = behavior(
  'reports-reachable-effects',
  'コマンドごとに到達できる副作用と、そこまでの経路を出す。無ければ無いと言う'
);

export const BEHAVIORS = [
  PRODUCES_ONE_RUNNABLE_FILE,
  NAMES_COMMANDS_AFTER_DIRECTORIES,
  REFUSES_AN_APP_WITHOUT_COMMANDS,
  REPORTS_WHAT_IT_WROTE,
  SHOWS_WHAT_EACH_COMMAND_IS_MADE_OF,
  REPORTS_REACHABLE_EFFECTS,
] as const;
