/**
 * Intent Graph からドキュメントを出す (§15)。
 *
 *   bun experiments/intent/doc.ts
 *
 * `.decopin-intent/` の断片を読んで Intent ごとにまとめるだけ。**テストを
 * 走らせた後でないと何も出ない**のは意図したところで、Evidence はテストの
 * 実行結果そのものだから (§10)。断片を静的に読む道は採らない — 落ちている
 * テストまで ✓ に見えるので、§11.7 False Verification になる。
 *
 * 絞り込んで実行すると走らなかった分の断片が古いまま残るので、
 * `--run` を付けるとテストのフル実行から作り直す。
 */
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type IntentReport,
  mergeReports,
  sharedCarriers,
  toDocument,
  unproven,
} from './core.ts';
import { SHARD_DIR } from './evidence.ts';

async function runTests(): Promise<number> {
  await rm(SHARD_DIR, { recursive: true, force: true });
  const proc = Bun.spawn(['bun', 'test'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return await proc.exited;
}

async function shards(): Promise<IntentReport[]> {
  let names: string[];
  try {
    names = await readdir(SHARD_DIR);
  } catch {
    return [];
  }
  const reports: IntentReport[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith('.json')) continue;
    reports.push(await Bun.file(join(SHARD_DIR, name)).json());
  }
  return reports;
}

const shouldRun = process.argv.includes('--run');
if (shouldRun) {
  const code = await runTests();
  if (code !== 0) {
    process.stderr.write(
      '[intent] テストが落ちたので、証明できていない Behavior があります\n'
    );
  }
}

const merged = new Map<string, IntentReport>();
for (const report of await shards()) {
  const found = merged.get(report.id);
  merged.set(
    report.id,
    found === undefined ? report : mergeReports(found, report)
  );
}

if (merged.size === 0) {
  process.stderr.write(
    `[intent] ${SHARD_DIR}/ が空です。'bun experiments/intent/doc.ts --run' で作り直せます\n`
  );
  process.exit(1);
}

for (const report of merged.values()) {
  process.stdout.write(toDocument(report));
}

/**
 * 全体の判定はここ。断片 1 つでは「この Intent の Behavior が全部証明された
 * か」を言えない (report(impl, { partial: true }) で分担している場合がある)。
 * 合流した後なら言えるので、残っていれば落とす。
 */
const left = [...merged.values()].flatMap((report) =>
  unproven(report).map((behavior) => `${report.id}/${behavior}`)
);

// §11.8 の重なり。疑いを出すだけで、正常な再利用かどうかは人が決める (§5.1)
const shared = sharedCarriers([...merged.values()]);
if (shared.length > 0) {
  process.stdout.write('\n複数の Intent が担わせている実装:\n');
  for (const carrier of shared) {
    process.stdout.write(`  ${carrier.name} (${carrier.where})\n`);
    for (const use of carrier.by) {
      process.stdout.write(`      ${use.intent} / ${use.behavior}\n`);
    }
  }
}

if (left.length > 0) {
  process.stderr.write(
    `[intent] 証明されていない Behavior: ${left.join(', ')}\n`
  );
  process.exit(1);
}
