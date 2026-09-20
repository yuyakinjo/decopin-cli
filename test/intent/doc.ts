/**
 * Intent Graph からドキュメントを出す (§15)。
 *
 *   bun run intent:doc       # 断片を消し、テストをフル実行してから出す
 *   bun test/intent/doc.ts   # 直前の `bun test` が残した断片から出す (CI はこちら)
 *   bun test/intent/doc.ts --list        # Intent の索引だけ (結末の語彙で引く)
 *   bun test/intent/doc.ts <id> [<id>]   # その Intent だけ詳細を出す
 *
 * **判定はどの形でも変わらない**。絞って出しても、証明されていない Behavior が
 * どこかにあれば exit 1 する — 絞り込みは読む量を減らすだけで、合格の線を動かさない。
 *
 * `.decopin-intent/` の断片を読んで Intent ごとにまとめるだけ。**テストを
 * 走らせた後でないと何も出ない**のは意図したところで、Evidence はテストの
 * 実行結果そのものだから (§10)。断片を静的に読む道は採らない — 落ちている
 * テストまで ✓ に見えるので、§11.7 False Verification になる。
 *
 * **断片は宣言と突き合わせる。** 絞り込み実行で走らなかった分や、消した Intent
 * の断片が残ると、存在しない Behavior が ✓ で出る (実測 2026-09-14: 消した
 * 8 番目の Intent が 6 Behavior ✓ で出た)。`intent.ts` に無い Intent / Behavior
 * の断片、断片の無い Intent があれば、何も出さずに落とす (ADR 48)。
 */
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type Intent,
  type IntentReport,
  mergeReports,
  sharedCarriers,
  toDocument,
  toIndexLine,
  unproven,
  waivedButProven,
} from './core.ts';
import { SHARD_DIR } from './evidence.ts';

/** Intent のディレクトリが並ぶ場所 (このファイルの隣) */
const INTENT_ROOT = import.meta.dir;
const REBUILD = "'bun run intent:doc' で作り直せます";

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

function isIntent(value: unknown): value is Intent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Intent).id === 'string' &&
    typeof (value as Intent).purpose === 'string' &&
    Array.isArray((value as Intent).behaviors)
  );
}

/** ディスク上で宣言されている Intent。id → Behavior id の集合 */
async function declared(): Promise<Map<string, Set<string>>> {
  const found = new Map<string, Set<string>>();
  for (const entry of await readdir(INTENT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(INTENT_ROOT, entry.name, 'intent.ts');
    if (!(await Bun.file(file).exists())) continue;
    const mod: Record<string, unknown> = await import(file);
    for (const value of Object.values(mod)) {
      if (isIntent(value)) {
        found.set(value.id, new Set(value.behaviors.map((b) => b.id)));
      }
    }
  }
  return found;
}

function fail(lines: readonly string[]): never {
  for (const line of lines) process.stderr.write(`[intent] ${line}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const shouldRun = args.includes('--run');
const indexOnly = args.includes('--list');
/** 絞り込む Intent id。無ければ全部 */
const only = new Set(args.filter((arg) => !arg.startsWith('--')));
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
  fail([`${SHARD_DIR}/ が空です。${REBUILD}`]);
}

// 断片と宣言の突き合わせ。古い断片から幽霊の Intent / Behavior を出さない
const intents = await declared();
const stale: string[] = [];
for (const report of merged.values()) {
  const behaviors = intents.get(report.id);
  if (behaviors === undefined) {
    stale.push(`${report.id} (宣言が無い)`);
    continue;
  }
  for (const behavior of report.behaviors) {
    if (!behaviors.has(behavior.id)) {
      stale.push(`${report.id}/${behavior.id} (宣言に無い Behavior)`);
    }
  }
}
const missing = [...intents.keys()].filter((id) => !merged.has(id));
if (stale.length > 0 || missing.length > 0) {
  fail([
    ...(stale.length > 0 ? [`古い断片: ${stale.join(', ')}`] : []),
    ...(missing.length > 0 ? [`断片の無い Intent: ${missing.join(', ')}`] : []),
    REBUILD,
  ]);
}

const shown = [...merged.values()].filter(
  (report) => only.size === 0 || only.has(report.id)
);
if (only.size > 0 && shown.length === 0) {
  fail([
    `その Intent は無い: ${[...only].join(', ')}`,
    `あるのは: ${[...merged.keys()].join(', ')}`,
  ]);
}
for (const report of shown) {
  process.stdout.write(indexOnly ? toIndexLine(report) : toDocument(report));
}

// §11.8 の重なり。疑いを出すだけで、正常な再利用かどうかは人が決める (§5.1)
const shared = indexOnly ? [] : sharedCarriers(shown);
if (shared.length > 0) {
  process.stdout.write('\n複数の Intent が担わせている実装:\n');
  for (const carrier of shared) {
    process.stdout.write(`  ${carrier.name} (${carrier.where})\n`);
    for (const use of carrier.by) {
      process.stdout.write(`      ${use.intent} / ${use.behavior}\n`);
    }
  }
}

/**
 * 全体の判定はここ。断片 1 つでは「この Intent の Behavior が全部証明された
 * か」を言えない (report(impl, { partial: true }) で分担している場合がある)。
 * 合流した後なら言える。免除の自壊 (waivedButProven) も、ファイル単位の判定を
 * すり抜けた分をここで拾う。
 */
const left = [...merged.values()].flatMap((report) =>
  unproven(report).map((behavior) => `${report.id}/${behavior}`)
);
const staleWaivers = [...merged.values()].flatMap((report) =>
  waivedButProven(report).map((behavior) => `${report.id}/${behavior}`)
);
if (left.length > 0 || staleWaivers.length > 0) {
  fail([
    ...(left.length > 0
      ? [`証明されていない Behavior: ${left.join(', ')}`]
      : []),
    ...(staleWaivers.length > 0
      ? [`証明できているので waived() を外す: ${staleWaivers.join(', ')}`]
      : []),
  ]);
}
