/**
 * `decopin dev` (ADR 5, ADR 43)。`app/` を見張って build を回し、
 * `.decopin/` と `dist/` を作り直す。
 *
 * 型は生成物なので、これを回していないと `cmd.tsx` の props の型が
 * 古くなる (docs/decisions.md の未決事項)。バンドルも毎回やり直すので、
 * 保存した直後の `./dist/index.js` が最新の app/ を映す (ADR 43)。
 */
import { watch } from 'node:fs';

import { build } from './index.ts';
import type { BuildOptions, BuildResult } from './index.ts';

export interface WatchOptions extends BuildOptions {
  /** まとめて処理するまでの待ち時間 (ms) */
  debounceMs?: number;
  onGenerate?: (result: BuildResult) => void;
  onError?: (error: unknown) => void;
}

export interface Watcher {
  close: () => void;
}

/** OS のディレクトリ監視。テストでは通知だけを決定的に差し替える。 */
export interface WatchBackend {
  watch: (directory: string, onChange: () => void) => Watcher;
}

const NODE_WATCH_BACKEND: WatchBackend = {
  watch: (directory, onChange) =>
    watch(directory, { recursive: true }, onChange),
};

export function watchApp(
  options: WatchOptions = {},
  backend: WatchBackend = NODE_WATCH_BACKEND
): Watcher {
  const appDir = options.appDir ?? 'app';
  const debounceMs = options.debounceMs ?? 50;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  let closed = false;

  const run = async (): Promise<void> => {
    if (closed) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      const result = await build(options);
      if (!closed) options.onGenerate?.(result);
    } catch (error) {
      if (!closed) options.onError?.(error);
    } finally {
      running = false;
      if (pending && !closed) {
        pending = false;
        void run();
      }
    }
  };

  const watcher = backend.watch(appDir, () => {
    if (closed) return;
    // エディタは 1 回の保存で複数のイベントを出すのでまとめる
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void run();
    }, debounceMs);
  });

  // 監視を先に始め、初回生成中の変更も取りこぼさないようにする。
  void run();

  return {
    close: () => {
      if (closed) return;
      closed = true;
      pending = false;
      if (timer !== undefined) clearTimeout(timer);
      watcher.close();
    },
  };
}
