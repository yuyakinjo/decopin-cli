/**
 * Behavior と実装の対応 (§8.2 証明分離パターン)。
 *
 * `waived()` した Behavior にも Carrier は繋いである。**証明の免除は実装の
 * 免除ではない** — 実体は watch.ts の NODE_WATCH_BACKEND だが、export されて
 * いないので watchApp で指す (実験 2 の finding 8 と同じ制約)。
 */
import run from '../../../src/cli/dev/cmd.ts';
import { build } from '../../../src/core/build/index.ts';
import { watchApp } from '../../../src/core/build/watch.ts';
import { carriedBy, implement } from '../core.ts';
import { KEEP_TYPES_HONEST_WHILE_EDITING } from './intent.ts';

const WATCH = 'src/core/build/watch.ts';
const CMD = 'src/cli/dev/cmd.ts';

export const IMPLEMENTATION = implement(KEEP_TYPES_HONEST_WHILE_EDITING, {
  // 作り直すのは build そのもの。watchApp はいつ呼ぶかを決めているだけ
  'rebuilds-on-every-change': [
    carriedBy(watchApp, WATCH),
    carriedBy(build, 'src/core/build/index.ts'),
  ],
  'keeps-watching-after-a-failure': [carriedBy(watchApp, WATCH)],
  // 実体は watchApp 内の debounce タイマーと pending フラグ
  'coalesces-bursts-of-changes': [carriedBy(watchApp, WATCH)],
  'reports-each-rebuild': [carriedBy(run, CMD), carriedBy(watchApp, WATCH)],
  'stops-on-ctrl-c': [carriedBy(run, CMD), carriedBy(watchApp, WATCH)],
  // 証明はしないが実装は繋いだままにする。実体は NODE_WATCH_BACKEND (非公開)
  'watches-the-real-filesystem': [carriedBy(watchApp, WATCH)],
});
