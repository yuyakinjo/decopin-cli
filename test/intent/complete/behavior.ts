/**
 * シェル補完の Behavior。
 *
 * 粒度の方針 (§18 Question B): 「Tab を押した人が観測できる結末」まで。
 * 旧 `test/runtime/` の補完テストは describe が 8 つあったが、そのうち
 * 「値の補完」「短縮形に = を付けた形」「解釈は実行時のトークナイザと同じ」は
 * 利用者から見ると同じ結末 (宣言した値が出る) なので 2 つに束ねた。
 * 逆に「壊れていても落ちない」は宣言が壊れた場合と complete.tsx が壊れた
 * 場合で同じ結末なので 1 つにしてある (§11.4 Behavior Explosion を避ける)。
 */
import { behavior } from '../core.ts';

/** 打ちかけの語から、その位置に置けるコマンドを出すこと */
export const COMPLETES_COMMANDS = behavior(
  'completes-commands',
  '直下のコマンドとグループを昇順で出し、打ちかけの語で絞る。グループの下ではその下だけを出す'
);

/** オプションは宣言から出し、打ち終えたものは二度勧めないこと */
export const COMPLETES_OPTIONS_ONCE = behavior(
  'completes-options-once',
  '`-` を打ったら宣言したオプションと --help を出す。hidden は出さず、打ち終えたものは繰り返せるもの以外消える'
);

/** 値は宣言 (enum) から出すこと。どの書き方で打っていても */
export const COMPLETES_DECLARED_VALUES = behavior(
  'completes-declared-values',
  'enum の値を、位置引数でもオプションでも、alias や `--name=` 経由でも出す'
);

/** 補完中の語の読み方が、実行時の読み方とずれないこと */
export const READS_WORDS_AS_THE_RUNTIME_DOES = behavior(
  'reads-words-as-the-runtime-does',
  '単独の `-`・値を取らないフラグ・`--no-flag` の解釈が実行時と同じで、次の補完位置がずれない'
);

/** 宣言に書けない候補は complete.tsx に聞くこと (ADR 38) */
export const ASKS_COMPLETE_TSX_AT_RUNTIME = behavior(
  'asks-complete-tsx-at-runtime',
  '実行時にしか決まらない候補は complete.tsx に、打った分を生の文字列で渡して聞き、宣言の enum と並べて出す'
);

/** 何が壊れていても Tab のたびにエラーを出さないこと */
export const NEVER_BREAKS_THE_SHELL = behavior(
  'never-breaks-the-shell',
  '宣言や complete.tsx が壊れていても、返ってこなくても、exit 0 で出せる分だけを返す'
);

/** プロトコルの入口が、利用者のコマンドの入力空間を奪わないこと */
export const LEAVES_NORMAL_ARGUMENTS_ALONE = behavior(
  'leaves-normal-arguments-alone',
  '`--` の無い `__complete` は補完ではなく通常の引数として扱う'
);

/** シェル側に渡すものが、構成を知らない薄いシムであること */
export const SHIPS_A_SHIM_THAT_ONLY_ASKS = behavior(
  'ships-a-shim-that-only-asks',
  'zsh のシムは bin 名で CLI に聞く手順だけを持ち、コマンドの構成を含まない。候補ゼロならファイル補完に落ちる'
);

export const BEHAVIORS = [
  COMPLETES_COMMANDS,
  COMPLETES_OPTIONS_ONCE,
  COMPLETES_DECLARED_VALUES,
  READS_WORDS_AS_THE_RUNTIME_DOES,
  ASKS_COMPLETE_TSX_AT_RUNTIME,
  NEVER_BREAKS_THE_SHELL,
  LEAVES_NORMAL_ARGUMENTS_ALONE,
  SHIPS_A_SHIM_THAT_ONLY_ASKS,
] as const;
