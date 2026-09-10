/**
 * `decopin build` の Intent。実験 3。§12 Intent Recovery。
 *
 * 元にした事実:
 *
 * - src/core/build/index.ts が scan → evaluate → check → emit → bundle を繋ぐ
 *   (ADR 5)。利用者が書くのは app/ のファイルだけで、配線の記述は無い
 * - 出力が 1 ファイルで shebang と実行権限を持つこと (配れる形)
 * - ADR 32: 副作用は「無いことの証明」に価値があるので、build が報告する
 *
 * この Intent は **test/integration/build.test.ts の前半 3 テスト**から回収した。
 * 同じファイルの後半 22 テストは build ではなく、生成物が実行時にどう振る舞うか
 * を見ていた (§11.5 Behavior Coupling の Intent 規模版)。別の Intent
 * run-commands-as-declared として切り出してある。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const SHIP_WHAT_THE_DIRECTORIES_DECLARE = intent({
  id: 'ship-what-the-directories-declare',
  purpose:
    'ルーティングも設定ファイルも書かずに、app/ に置いたファイルだけから配れる 1 本の実行ファイルを得られるようにする',
  behaviors: BEHAVIORS,
});
