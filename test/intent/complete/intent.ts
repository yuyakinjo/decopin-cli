/**
 * シェル補完の Intent。
 *
 * 既存コードからの回収 (§12 Intent Recovery)。元にした事実は 3 つ:
 *
 * - src/features/conventions/complete/runtime.ts のヘッダ (情報源は help と
 *   同じ argv.tsx の宣言ただ 1 つ。宣言が壊れていても決して投げない)
 * - src/features/conventions/complete/build.ts のヘッダ (シムは「CLI に聞きに
 *   行く」手順だけを持ち、コマンドの構成を含まない)
 * - ADR 21 (候補は CLI 自身が返す) と ADR 38 (実行時に決まる候補は complete.tsx)
 *
 * Identity は目的であってプロトコル名ではない (§11.9)。`__complete` が別の
 * 名前になっても、zsh 以外のシェルが増えても、この Intent は同じものを指す。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const COMPLETE_FROM_THE_DECLARATIONS = intent({
  id: 'complete-from-the-declarations',
  purpose:
    'コマンドを書く人が補完の定義を別に書かなくても、宣言したサブコマンド・オプション・値を利用者が Tab で引き出せるようにする',
  behaviors: BEHAVIORS,
});
