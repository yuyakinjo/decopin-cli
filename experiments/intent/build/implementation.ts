/**
 * Behavior と実装の対応 (§8.2 証明分離パターン)。
 *
 * build は init/gen と違って **1 つの Behavior に多くのモジュールが並ぶ**。
 * scan → evaluate → check → emit → bundle が繋がって初めて 1 つの結末になるので、
 * Carrier を 1 つに絞ると嘘になる。
 */
import run from '../../../src/cli/build/cmd.ts';
import { bundle } from '../../../src/core/build/bundler.ts';
import {
  generateEntry,
  generateRoutes,
} from '../../../src/core/build/codegen.ts';
import { analyzeEffects } from '../../../src/core/build/effects.ts';
import { build, generate } from '../../../src/core/build/index.ts';
import { scan } from '../../../src/core/build/scanner.ts';
import { carriedBy, implement } from '../core.ts';
import { SHIP_WHAT_THE_DIRECTORIES_DECLARE } from './intent.ts';

const CMD = 'src/cli/build/cmd.ts';
const INDEX = 'src/core/build/index.ts';
const CODEGEN = 'src/core/build/codegen.ts';

export const IMPLEMENTATION = implement(SHIP_WHAT_THE_DIRECTORIES_DECLARE, {
  // shebang と実行権限は bundler が付ける。entry.ts の形は codegen が決める
  'produces-one-runnable-file': [
    carriedBy(bundle, 'src/core/build/bundler.ts'),
    carriedBy(generateEntry, CODEGEN),
    carriedBy(build, INDEX),
  ],
  // 名前を決めるのは scanner。それを実行時の表にするのが codegen
  'names-commands-after-directories': [
    carriedBy(scan, 'src/core/build/scanner.ts'),
    carriedBy(generateRoutes, CODEGEN),
  ],
  'refuses-an-app-without-commands': [carriedBy(generate, INDEX)],
  // 何を書いたかを知っているのは generate、それを出すのは CLI 層
  'reports-what-it-wrote': [carriedBy(run, CMD), carriedBy(generate, INDEX)],
  'reports-reachable-effects': [
    carriedBy(analyzeEffects, 'src/core/build/effects.ts'),
    carriedBy(run, CMD),
  ],
});
