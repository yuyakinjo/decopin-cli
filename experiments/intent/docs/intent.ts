/**
 * `decopin docs` の Intent。実験 5。**Intent-First** (書いた時点で実装は無い)。
 *
 * 元にした事実は既存コードではなく、Issue #3 と、そこで語られたイメージ:
 *
 * - 「app フォルダ配下の構造からドキュメントを生成」
 * - 「生成したドキュメントはコマンド単位で実行可能」
 * - 頭にあったのは OpenAPI (Swagger) の「押したら結果が返る」形
 *
 * 押せる HTML は、任意のコマンドを実行するサーバーを抱えることになるので
 * 採らなかった。**押せることではなく「打たずに結果が分かること」が目的**
 * だと読み、そちらを purpose に置いている。押す UI は、この purpose を
 * 満たす別の Implementation として後から足せる。
 *
 * help (§ADR 8) との境界: help は**打っている人**が今このコマンドをどう
 * 呼ぶかを知るためのもので、1 コマンド分・その場限り。docs は**まだ打って
 * いない人**が全体を見渡すためのもので、結果まで含めて残る。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const KNOW_WHAT_A_COMMAND_DOES_WITHOUT_RUNNING_IT = intent({
  id: 'know-what-a-command-does-without-running-it',
  purpose:
    'まだ打っていない人が、app/ にあるコマンドを、どう呼ぶかと何が返るかまで分かる形で読めるようにする',
  behaviors: BEHAVIORS,
});
