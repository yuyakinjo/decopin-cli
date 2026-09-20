/**
 * Behavior と実装の対応 (§8.2 証明分離パターン)。
 *
 * 候補を決める仕事は completionCandidates に集まっているので、runtime の
 * Intent と同じく **1 つの Carrier が多くの Behavior に出る**。区別を付けて
 * いるのは並ぶもう 1 つの Carrier の方 (実験 2 の finding 8)。
 *
 * run は `__complete --` を見て completionCandidates に渡す入口。ここが
 * 候補の書式 (1 行 1 つ、値<TAB>説明) と exit 0 を決めている。
 */
import { build } from '../../../src/core/build/index.ts';
import { run } from '../../../src/core/runtime/run.tsx';
import { tokenize } from '../../../src/features/conventions/argv/tokens.ts';
import {
  binaryName,
  completionFileName,
  generateZshCompletion,
  resolveBinaryName,
} from '../../../src/features/conventions/complete/build.ts';
import {
  completionCandidates,
  formatCandidates,
} from '../../../src/features/conventions/complete/runtime.ts';
import { carriedBy, implement } from '../core.ts';
import { COMPLETE_FROM_THE_DECLARATIONS } from './intent.ts';

const RUNTIME = 'src/features/conventions/complete/runtime.ts';
const BUILD = 'src/features/conventions/complete/build.ts';
const RUN = 'src/core/runtime/run.tsx';

export const IMPLEMENTATION = implement(COMPLETE_FROM_THE_DECLARATIONS, {
  'completes-commands': [
    carriedBy(completionCandidates, RUNTIME),
    carriedBy(formatCandidates, RUNTIME),
  ],
  'completes-options-once': [carriedBy(completionCandidates, RUNTIME)],
  'completes-declared-values': [carriedBy(completionCandidates, RUNTIME)],
  // 語の位置を決めるのは実行時のトークナイザ。補完側は独自に解析しない
  'reads-words-as-the-runtime-does': [
    carriedBy(tokenize, 'src/features/conventions/argv/tokens.ts'),
    carriedBy(completionCandidates, RUNTIME),
  ],
  'asks-complete-tsx-at-runtime': [carriedBy(completionCandidates, RUNTIME)],
  // 宣言の読み込みと complete.tsx の呼び出しは候補側で握り、入口でも握る
  'never-breaks-the-shell': [
    carriedBy(completionCandidates, RUNTIME),
    carriedBy(run, RUN),
  ],
  // 2 語目の `--` まで見て判定しているのは run
  'leaves-normal-arguments-alone': [carriedBy(run, RUN)],
  // シムの中身は build.ts、それを dist/completions/ に書くのは build
  'ships-a-shim-that-only-asks': [
    carriedBy(generateZshCompletion, BUILD),
    carriedBy(completionFileName, BUILD),
    carriedBy(binaryName, BUILD),
    carriedBy(resolveBinaryName, BUILD),
    carriedBy(build, 'src/core/build/index.ts'),
  ],
});
