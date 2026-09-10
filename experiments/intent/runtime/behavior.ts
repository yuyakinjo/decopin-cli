/**
 * 生成された CLI の実行時の Behavior。
 *
 * **10 個ある。** init 4+1、gen 6、build 5 に対して倍近い。これは粒度を
 * 下げたからではなく、この Intent が抱えている規約 (cmd / argv / stdin /
 * help / error / layout / middleware / not-found) の数がそのまま出たため。
 *
 * §11.4 Behavior Explosion は「Intent が判断を経ずに広がった兆候」とされる。
 * ここでは広がったのではなく最初から広い。ただし**同じ信号が出る**ので、
 * 兆候だけでは両者を区別できないことが分かる (README の 12 に記録)。
 *
 * 割り方の基準は init/gen と同じ「失敗したときに直す場所が別かどうか」。
 * 例えば「--help が出る」と「引数が読める」は、どちらも argv.tsx の宣言を
 * 使うが、壊れたときに見る先は help.tsx と parse.ts で別になる。
 */
import { behavior } from '../core.ts';

export const ROUTES_DIRECTORIES_TO_COMMANDS = behavior(
  'routes-directories-to-commands',
  'app/ の階層がそのままコマンドの階層になり、入れ子も引数なしで辿れる'
);

export const PARSES_ARGV_AS_DECLARED = behavior(
  'parses-argv-as-declared',
  'argv.tsx の宣言どおりに位置引数・オプション・短縮形・既定値・繰り返し・束ねを受け取る'
);

export const READS_STDIN_AS_DECLARED = behavior(
  'reads-stdin-as-declared',
  'stdin.tsx の宣言どおりに標準入力を lines / text / json として読む'
);

export const REJECTS_INVALID_INPUT = behavior(
  'rejects-invalid-input',
  '宣言に合わない引数・入力は実行せず、理由を stderr に出して exit 2'
);

export const EXPLAINS_USAGE_FROM_DECLARATIONS = behavior(
  'explains-usage-from-declarations',
  '--help が宣言から使い方を組み立て、help.tsx があれば足して stdout に exit 0'
);

export const GUIDES_WHEN_THE_COMMAND_IS_MISSING = behavior(
  'guides-when-the-command-is-missing',
  'コマンド名が無い・間違っている・グループ止まりのときは、候補か一覧を stderr に出して exit 2'
);

export const HANDLES_ERRORS_WHERE_DECLARED = behavior(
  'handles-errors-where-declared',
  '一番近い error.tsx が使われ、無ければ上位を辿り、最後は global-error.tsx に落ちる'
);

export const WRAPS_OUTPUT_IN_LAYOUT = behavior(
  'wraps-output-in-layout',
  'layout.tsx が出力を包む。失敗したときは layout ごと stderr 側に出す'
);

export const RUNS_MIDDLEWARE_AROUND_THE_COMMAND = behavior(
  'runs-middleware-around-the-command',
  'middleware.tsx が next の前後に割り込め、stdout を汚さずに足せる'
);

export const KEEPS_PIPES_CLEAN = behavior(
  'keeps-pipes-clean',
  '端末でなければ装飾を落とし、パイプの先で読める出力にする'
);

export const BEHAVIORS = [
  ROUTES_DIRECTORIES_TO_COMMANDS,
  PARSES_ARGV_AS_DECLARED,
  READS_STDIN_AS_DECLARED,
  REJECTS_INVALID_INPUT,
  EXPLAINS_USAGE_FROM_DECLARATIONS,
  GUIDES_WHEN_THE_COMMAND_IS_MISSING,
  HANDLES_ERRORS_WHERE_DECLARED,
  WRAPS_OUTPUT_IN_LAYOUT,
  RUNS_MIDDLEWARE_AROUND_THE_COMMAND,
  KEEPS_PIPES_CLEAN,
] as const;
