/**
 * `decopin dev` の Behavior。
 *
 * 始める前の予想は「watch なのでほとんど `waived()` になる」だった。
 * **外れた。** 6 個のうち免除は 1 個で、それは「watch すること」ではなく
 * **OS のファイル通知に触る一点**だった。
 *
 * 残り 5 個が証明できたのは、`watchApp()` が通知の受け口を差し替えられる
 * ように作られていたから (`WatchBackend`)。つまり免除の範囲を決めていたのは
 * 「非決定的な機能かどうか」ではなく、**非決定な部分がどこまで括り出して
 * あるか**だった。
 */
import { behavior, waived } from '../core.ts';

export const REBUILDS_ON_EVERY_CHANGE = behavior(
  'rebuilds-on-every-change',
  'app/ が変わるたびに型とバンドルを作り直し、保存直後の dist/ が最新を映す'
);

export const KEEPS_WATCHING_AFTER_A_FAILURE = behavior(
  'keeps-watching-after-a-failure',
  '宣言の誤りは報告するだけで監視を打ち切らず、次の変更をまた評価する'
);

export const COALESCES_BURSTS_OF_CHANGES = behavior(
  'coalesces-bursts-of-changes',
  '1 回の保存で通知が何度来てもビルドは 1 回。ビルド中の変更は取りこぼさない'
);

export const REPORTS_EACH_REBUILD = behavior(
  'reports-each-rebuild',
  '作り直すたびに、いま何コマンドあるかと、どこに書いたかを出す'
);

export const STOPS_ON_CTRL_C = behavior(
  'stops-on-ctrl-c',
  'Ctrl+C で監視を閉じ、失敗ではなく成功として終わる'
);

export const WATCHES_THE_REAL_FILESYSTEM = waived(
  'watches-the-real-filesystem',
  'OS のファイル通知を実際に受け取り、エディタの保存を拾う',
  'fs.watch の通知は OS とファイルシステムに依存し (macOS は遅延、Linux は inotify の上限)、いつ来るかがテストの中で確定しない。他の 5 つは通知の受け口を差し替えて証明しているので、免除はこの一点だけに閉じている'
);

export const BEHAVIORS = [
  REBUILDS_ON_EVERY_CHANGE,
  KEEPS_WATCHING_AFTER_A_FAILURE,
  COALESCES_BURSTS_OF_CHANGES,
  REPORTS_EACH_REBUILD,
  STOPS_ON_CTRL_C,
  WATCHES_THE_REAL_FILESYSTEM,
] as const;
