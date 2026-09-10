/**
 * Intent `keep-types-honest-while-editing` の Evidence。
 *
 * test/build/watch.test.ts の 2 テストをここへ移して Behavior に結び直し、
 * 3 つ足した (まとめ方・出力・終わり方)。
 *
 * `watchApp()` の 2 引数目で通知の受け口を差し替えられるので、**非決定なのは
 * OS のファイル通知だけ**に閉じている。そこだけ waived() にしてある。
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { BuildResult } from '../../../src/core/build/index.ts';
import { watchApp } from '../../../src/core/build/watch.ts';
import type { WatchBackend, Watcher } from '../../../src/core/build/watch.ts';
import { toDocument, toReport } from '../core.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as DEV } from './implementation.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'src/cli/bin.ts');
const NOOP = 'export default function Command() {\n  return null;\n}\n';

let watcher: Watcher | undefined;
let workspace: string | undefined;
/**
 * 生成される entry.ts は `import { run } from 'decopin-cli'` を含むので、
 * バンドルが通るようにこのリポジトリ配下に置く
 */
let workDir: string | undefined;

afterEach(async () => {
  watcher?.close();
  watcher = undefined;
  if (workspace !== undefined)
    await rm(workspace, { recursive: true, force: true });
  workspace = undefined;
  if (workDir !== undefined)
    await rm(workDir, { recursive: true, force: true });
  workDir = undefined;
});

/** OS のファイル通知に依存せず、変更通知をテストから送る */
function manualWatch(): { backend: WatchBackend; change: () => void } {
  let onChange: (() => void) | undefined;
  return {
    backend: {
      watch: (_directory, listener) => {
        onChange = listener;
        return {
          close: () => {
            onChange = undefined;
          },
        };
      },
    },
    change: () => {
      if (onChange === undefined) throw new Error('watcher is not active');
      onChange();
    },
  };
}

/** 条件が満たされるまで短い間隔で待つ (watch は非同期なので) */
async function waitFor<T>(
  read: () => T | undefined,
  timeoutMs = 5000
): Promise<T> {
  const deadline = Temporal.Now.instant().add({ milliseconds: timeoutMs });
  while (Temporal.Instant.compare(Temporal.Now.instant(), deadline) < 0) {
    const value = read();
    if (value !== undefined) return value;
    await Bun.sleep(20);
  }
  throw new Error('timed out');
}

/** 非同期の条件が満たされるまで待つ (waitFor は同期の read しか見ない) */
async function waitUntil(
  ready: () => Promise<boolean>,
  timeoutMs = 20_000
): Promise<void> {
  const deadline = Temporal.Now.instant().add({ milliseconds: timeoutMs });
  while (Temporal.Instant.compare(Temporal.Now.instant(), deadline) < 0) {
    if (await ready()) return;
    await Bun.sleep(50);
  }
  throw new Error('timed out');
}

/** app/probe/cmd.tsx だけを持つ作業場を用意する */
async function scratch(): Promise<{ appDir: string; outDir: string }> {
  workspace = await mkdtemp(join(tmpdir(), 'decopin-dev-'));
  workDir = await mkdtemp(join(REPO, '.decopin-test-dev-'));
  const appDir = join(workspace, 'app');
  await mkdir(join(appDir, 'probe'), { recursive: true });
  await writeFile(join(appDir, 'probe/cmd.tsx'), NOOP);
  return { appDir, outDir: join(workspace, 'dist') };
}

describeBehavior(DEV, 'rebuilds-on-every-change', () => {
  proves(
    '起動時に一度 build し、app/ の変化で型とバンドルを作り直す',
    async () => {
      const { appDir, outDir } = await scratch();
      const results: BuildResult[] = [];
      const controlled = manualWatch();

      watcher = watchApp(
        {
          appDir,
          workDir,
          outDir,
          program: 'cli',
          debounceMs: 10,
          onGenerate: (result) => results.push(result),
        },
        controlled.backend
      );

      const first = await waitFor(() => results[0]);
      expect(first.routes.map((route) => route.name)).toEqual(['probe']);
      expect(await Bun.file(first.files.types).text()).toContain('"probe"');
      // バンドルまで済んでいる (bun run dev 中に ./dist/index.js を叩ける)
      expect(first.outPath).toBe(join(outDir, 'index.js'));
      expect(await Bun.file(first.outPath).exists()).toBe(true);

      // コマンドを増やすと、型にもバンドルにも増える
      const added = join(appDir, 'added');
      await mkdir(added, { recursive: true });
      await writeFile(join(added, 'cmd.tsx'), NOOP);
      controlled.change();

      const updated = await waitFor(() =>
        results.find((result) =>
          result.routes.some((route) => route.name === 'added')
        )
      );
      expect(updated.routes.map((route) => route.name).sort()).toEqual([
        'added',
        'probe',
      ]);
      expect(await Bun.file(updated.files.types).text()).toContain('"added"');
      expect(await Bun.file(updated.outPath).text()).toContain('added');
    },
    30_000
  );
});

describeBehavior(DEV, 'keeps-watching-after-a-failure', () => {
  proves(
    '宣言の誤りは報告するだけで、次の変更をまた評価する',
    async () => {
      workspace = await mkdtemp(join(tmpdir(), 'decopin-dev-'));
      const errors: unknown[] = [];
      const results: BuildResult[] = [];
      const controlled = manualWatch();

      watcher = watchApp(
        {
          appDir: 'test/fixtures/eval-app',
          workDir: join(workspace, '.decopin'),
          outDir: join(workspace, 'dist'),
          program: 'cli',
          debounceMs: 10,
          onGenerate: (result) => results.push(result),
          onError: (error) => errors.push(error),
        },
        controlled.backend
      );

      const error = await waitFor(() => errors[0]);
      expect(String(error)).toContain('Invalid declarations');
      expect(String(error)).toContain('bad/argv.tsx');
      expect(results).toEqual([]);

      controlled.change();
      const nextError = await waitFor(() => errors[1]);
      expect(String(nextError)).toContain('Invalid declarations');
      expect(results).toEqual([]);
    },
    15_000
  );
});

describeBehavior(DEV, 'coalesces-bursts-of-changes', () => {
  proves(
    '保存 1 回で通知が何度来てもビルドは 1 回',
    async () => {
      const { appDir, outDir } = await scratch();
      const results: BuildResult[] = [];
      const controlled = manualWatch();

      watcher = watchApp(
        {
          appDir,
          workDir,
          outDir,
          program: 'cli',
          debounceMs: 30,
          onGenerate: (result) => results.push(result),
        },
        controlled.backend
      );
      await waitFor(() => results[0]);

      // エディタが 1 回の保存で出す複数イベントを模す
      controlled.change();
      controlled.change();
      controlled.change();

      await waitFor(() => results[1]);
      // debounce の窓を十分に越えてから数える
      await Bun.sleep(300);
      expect(results.length).toBe(2);
    },
    30_000
  );

  proves(
    'ビルド中に来た変更は捨てず、終わってからもう一度走る',
    async () => {
      const { appDir, outDir } = await scratch();
      const results: BuildResult[] = [];
      const controlled = manualWatch();

      watcher = watchApp(
        {
          appDir,
          workDir,
          outDir,
          program: 'cli',
          debounceMs: 0,
          onGenerate: (result) => results.push(result),
        },
        controlled.backend
      );
      // 初回ビルドの最中に通知する (await を挟まないので必ず走行中)
      controlled.change();

      await waitFor(() => results[1]);
      await Bun.sleep(300);
      expect(results.length).toBe(2);
    },
    30_000
  );
});

/** dev は Ctrl+C まで終わらないので、別プロセスで起こして落とす */
async function dev(args: string[], stopAfter: () => Promise<void>) {
  const proc = Bun.spawn(['bun', BIN, 'dev', ...args], {
    cwd: REPO,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const collected = { stdout: '', stderr: '' };
  const reading = Promise.all([
    new Response(proc.stdout).text().then((text) => {
      collected.stdout = text;
    }),
    new Response(proc.stderr).text().then((text) => {
      collected.stderr = text;
    }),
  ]);
  await stopAfter();
  proc.kill('SIGINT');
  const code = await proc.exited;
  await reading;
  return { ...collected, code };
}

describeBehavior(DEV, 'reports-each-rebuild', () => {
  proves(
    'いま何コマンドあるかと、どこに書いたかを出す',
    async () => {
      const { appDir, outDir } = await scratch();
      const result = await dev(
        ['--app', appDir, '--work', workDir as string, '--out', outDir],
        // 初回ビルドが終わるまで待つ。出力を見たいので落とすのはその後
        async () => {
          await waitUntil(() => Bun.file(join(outDir, 'index.js')).exists());
          await Bun.sleep(200);
        }
      );
      expect(result.stdout).toContain('[decopin] 1 command(s): probe');
      expect(result.stdout).toContain(join(workDir as string, 'types.d.ts'));
      expect(result.stdout).toContain(join(outDir, 'index.js'));
    },
    30_000
  );
});

describeBehavior(DEV, 'stops-on-ctrl-c', () => {
  proves(
    'SIGINT で監視を閉じ、終了コード 0 で終わる',
    async () => {
      const { appDir, outDir } = await scratch();
      const result = await dev(
        ['--app', appDir, '--work', workDir as string, '--out', outDir],
        async () => {
          await waitUntil(() => Bun.file(join(outDir, 'index.js')).exists());
        }
      );
      // watch を張ったまま殺されたのではなく、自分で閉じて 0 を返している
      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
    },
    30_000
  );
});

/** Graph そのものの検査。Behavior の証明ではないので proves() は使わない */
describe('Intent Graph', () => {
  test('Implementation が指すファイルが実在する', async () => {
    const missing: string[] = [];
    for (const carriers of Object.values(DEV.carriers)) {
      for (const carrier of carriers) {
        if (!(await Bun.file(join(REPO, carrier.where)).exists())) {
          missing.push(carrier.where);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ここまでの Evidence でドキュメントが組み立つ', () => {
    const doc = toDocument(toReport(DEV));
    expect(doc).toContain('Intent: keep-types-honest-while-editing');
    expect(doc).not.toContain('✗');
  });
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(DEV);
