/**
 * 生成された CLI が実行時にどう振る舞うかの Intent。実験 3 の後半。
 *
 * **元は build のテストファイルの中にいた。** test/integration/build.test.ts の
 * `describe('生成された CLI')` が 22 テストあり、どれも build ではなく
 * ランタイムとルーターを見ていた。build の Behavior として数えると、
 * 「ビルドが壊れた」と「実行時が壊れた」が同じ Intent の同じ列に並ぶ。
 * §11.5 Behavior Coupling の Intent 規模版なので、ここに切り出した。
 *
 * 境界の引き方: **build は何を書いたかまで、runtime は書いたものが何をするか**。
 * 生成物が「実行できる」ことは build 側 (produces-one-runnable-file)、
 * 「宣言どおりに動く」ことはこちら。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const RUN_COMMANDS_AS_DECLARED = intent({
  id: 'run-commands-as-declared',
  purpose:
    'コマンドを書く人が、ルーティング・引数解析・入力の読み取り・エラー処理・出力の体裁を自分で書かなくても、宣言したとおりに動くようにする',
  behaviors: BEHAVIORS,
});
