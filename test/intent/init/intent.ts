/**
 * `decopin init` の Intent。
 *
 * 既存コードからの回収なので、これは Intent-First そのものではなく
 * §12 の Intent Recovery。元にした事実は 2 つ:
 *
 * - src/core/init/index.ts のヘッダ (README の Setup を手で再現するのは項目が
 *   多く、tsconfig を 1 つ間違えると "Could not resolve: react/jsx-runtime" の
 *   ような遠いエラーになる / 既にあるファイルは上書きしない)
 * - src/cli/init/cmd.ts が最後に Next: を出していること
 *
 * Identity は目的であってコマンド名ではない (§11.9)。`init` が別の名前に
 * なっても、雛形の作り方が変わっても、この Intent は同じものを指す。
 */
import { intent } from '../core.ts';
import { BEHAVIORS } from './behavior.ts';

export const START_BY_WRITING_COMMANDS = intent({
  id: 'start-by-writing-commands',
  purpose:
    '利用者が設定を組み立てるところではなく、コマンドを書くところから始められるようにする',
  behaviors: BEHAVIORS,
});
