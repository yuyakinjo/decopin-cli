/**
 * `decopin dev` (ADR 5)。`app/` を見張って `.decopin/` を作り直す。
 *
 * 型は生成物なので、これを回していないと `cmd.tsx` の props の型が
 * 古くなる (docs/decisions.md の未決事項)。バンドルはしない。
 */
import { watch } from 'node:fs';

import { generate } from './index.ts';
import type { GenerateOptions, GenerateResult } from './index.ts';

export interface WatchOptions extends GenerateOptions {
  /** まとめて処理するまでの待ち時間 (ms) */
  debounceMs?: number;
  onGenerate?: (result: GenerateResult) => void;
  onError?: (error: unknown) => void;
}

export interface Watcher {
  close: () => void;
}

export function watchApp(options: WatchOptions = {}): Watcher {
  const appDir = options.appDir ?? 'app';
  const debounceMs = options.debounceMs ?? 50;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;

  const run = async (): Promise<void> => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      options.onGenerate?.(await generate(options));
    } catch (error) {
      options.onError?.(error);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        void run();
      }
    }
  };

  void run();

  const watcher = watch(appDir, { recursive: true }, () => {
    // エディタは 1 回の保存で複数のイベントを出すのでまとめる
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => void run(), debounceMs);
  });

  return {
    close: () => {
      if (timer !== undefined) clearTimeout(timer);
      watcher.close();
    },
  };
}
