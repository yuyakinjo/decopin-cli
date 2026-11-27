#!/usr/bin/env bun
/**
 * commander.js と decopin-cli で同じ CLI (bench/commander/) を作り、起動時間を比べる。
 *
 *   bun scripts/bench-commander.ts            hyperfine で測って表を出す
 *   bun scripts/bench-commander.ts --runs 100
 *
 * 公平にするための決めごと:
 *   - 同じ仕様 (引数・オプション・検証・出力)。測る前に出力が一致するか確かめる
 *   - 同じ実行環境 (Bun) で、同じ形 (1 ファイルに bundle / --compile --bytecode)
 *   - Node + commander は参考値として別の行に置く
 *   - 計測方法は guides/startup-cost と同じ (hyperfine --shell=none --warmup 20)
 *
 * 結果は .decopin-bench/result.md (表) と result.json (hyperfine の生データ)。
 */
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { build } from '../src/core/build/index.ts';

const ROOT = join(import.meta.dir, '..');
const WORK = join(ROOT, '.decopin-bench');
const runsIndex = process.argv.indexOf('--runs');
const runs = runsIndex === -1 ? 50 : Number(process.argv[runsIndex + 1] ?? 50);
const ENV = { ...process.env, NO_COLOR: '1' };

async function sh(cmd: string[], cwd = ROOT): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd,
    env: ENV,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`${cmd.join(' ')} failed (${code}):\n${err}`);
  return out;
}

async function run(cmd: string[]) {
  const proc = Bun.spawn(cmd, { env: ENV, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

await rm(WORK, { recursive: true, force: true });
await mkdir(WORK, { recursive: true });

console.log('building...');
// decopin: app/ → .decopin-bench/decopin/index.js (decopin build と同じ経路)
const decopin = await build({
  appDir: join(ROOT, 'bench/commander/decopin/app'),
  workDir: join(WORK, 'decopin-gen'),
  outDir: join(WORK, 'decopin'),
  program: 'decopin-cli',
});
const decopinJs = decopin.outPath;
const decopinBin = join(WORK, 'decopin-bytecode');
await sh([
  'bun',
  'build',
  '--compile',
  '--bytecode',
  decopin.files.entry,
  '--outfile',
  decopinBin,
]);

// commander: cli.ts → 1 ファイルの bundle と、--compile --bytecode
const commanderSrc = join(ROOT, 'bench/commander/commander/cli.ts');
const commanderJs = join(WORK, 'commander/index.js');
await sh([
  'bun',
  'build',
  '--target',
  'bun',
  commanderSrc,
  '--outfile',
  commanderJs,
]);
const commanderBin = join(WORK, 'commander-bytecode');
await sh([
  'bun',
  'build',
  '--compile',
  '--bytecode',
  commanderSrc,
  '--outfile',
  commanderBin,
]);
const commanderNodeJs = join(WORK, 'commander/node.mjs');
await sh([
  'bun',
  'build',
  '--target',
  'node',
  '--format',
  'esm',
  commanderSrc,
  '--outfile',
  commanderNodeJs,
]);

// 下限: Bun 自体の起動と、空のコンパイル済みバイナリ
const empty = join(WORK, 'empty.js');
await Bun.write(empty, 'process.exit(0);\n');
const emptyBin = join(WORK, 'empty-bytecode');
await sh([
  'bun',
  'build',
  '--compile',
  '--bytecode',
  empty,
  '--outfile',
  emptyBin,
]);

// 測る前に、同じ入力で同じ出力になるかを確かめる
const parity: [string, string[]][] = [
  ['defaults', ['hello']],
  ['args + options', ['hello', 'Alice', '--loud', '--times', '2']],
  ['short flags', ['hello', 'Bob', '-l', '-t', '3']],
];
for (const [label, args] of parity) {
  const a = await run(['bun', decopinJs, ...args]);
  const b = await run(['bun', commanderJs, ...args]);
  if (a.stdout !== b.stdout || a.code !== b.code) {
    console.error(
      `output differs for ${label}:\n decopin: ${JSON.stringify(a)}\n commander: ${JSON.stringify(b)}`
    );
    process.exit(1);
  }
}
const invalid = ['hello', '--times', '9'];
const invalidDecopin = await run(['bun', decopinJs, ...invalid]);
const invalidCommander = await run(['bun', commanderJs, ...invalid]);
console.log('parity: valid inputs match');
console.log(
  `invalid (--times 9): decopin exit ${invalidDecopin.code}: ${invalidDecopin.stderr.trim()}`
);
console.log(
  `invalid (--times 9): commander exit ${invalidCommander.code}: ${invalidCommander.stderr.trim()}`
);

const ARGS = 'hello Alice --loud --times 2';
const commands: { label: string; cmd: string; file?: string }[] = [
  { label: 'empty Bun script (runtime floor)', cmd: `bun ${empty}` },
  {
    label: 'empty compiled Bun binary (compiled floor)',
    cmd: emptyBin,
    file: emptyBin,
  },
  {
    label: 'commander — `bun index.js`',
    cmd: `bun ${commanderJs} ${ARGS}`,
    file: commanderJs,
  },
  {
    label: 'decopin — `bun index.js`',
    cmd: `bun ${decopinJs} ${ARGS}`,
    file: decopinJs,
  },
  {
    label: 'commander — `--compile --bytecode`',
    cmd: `${commanderBin} ${ARGS}`,
    file: commanderBin,
  },
  {
    label: 'decopin — `--compile --bytecode`',
    cmd: `${decopinBin} ${ARGS}`,
    file: decopinBin,
  },
  // Node は参考値。起動そのものが重いので、Node の下限も並べる
  { label: '`node -e 0` (Node floor, reference)', cmd: 'node -e 0' },
  {
    label: 'commander — `node index.mjs` (reference)',
    cmd: `node ${commanderNodeJs} ${ARGS}`,
    file: commanderNodeJs,
  },
];

const json = join(WORK, 'result.json');
console.log(`\nmeasuring (${runs} runs each)...`);
const proc = Bun.spawn(
  [
    'hyperfine',
    '--shell=none',
    '--warmup',
    '20',
    '--runs',
    String(runs),
    '--export-json',
    json,
    ...commands.flatMap((c) => ['-n', c.label, c.cmd]),
  ],
  { env: ENV, stdout: 'inherit', stderr: 'inherit' }
);
if ((await proc.exited) !== 0) process.exit(1);

/** hyperfine 1.x は mean/stddev を直に、2.x は summary.time_wall_clock に持つ */
interface HyperfineResult {
  mean?: number;
  stddev?: number;
  summary?: {
    time_wall_clock: { mean: number; stddev: number };
    memory_peak_resident?: { mean: number };
  };
}
const { results } = (await Bun.file(json).json()) as {
  results: HyperfineResult[];
};

function wall(r: HyperfineResult): { mean: number; stddev: number } {
  return (
    r.summary?.time_wall_clock ?? {
      mean: r.mean ?? NaN,
      stddev: r.stddev ?? NaN,
    }
  );
}

function memory(r: HyperfineResult): string {
  const bytes = r.summary?.memory_peak_resident?.mean;
  return bytes === undefined ? '—' : `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function size(path: string | undefined): string {
  if (path === undefined) return '—';
  const bytes = Bun.file(path).size;
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(2)} MB`
    : `${(bytes / 1000).toFixed(2)} KB`;
}

const rows = commands.map((c, i) => {
  const r = results[i] as HyperfineResult;
  const { mean, stddev } = wall(r);
  return `| ${c.label} | ${(mean * 1000).toFixed(1)} ± ${(stddev * 1000).toFixed(1)} ms | ${memory(r)} | ${size(c.file)} |`;
});
const commit = (await sh(['git', 'rev-parse', '--short', 'HEAD'])).trim();
const nodeVersion = (await sh(['node', '--version'])).trim();
const commanderVersion = (
  (await Bun.file(
    join(ROOT, 'node_modules/commander/package.json')
  ).json()) as { version: string }
).version;
const table = [
  `<!-- ${new Date().toISOString().slice(0, 10)} ${process.platform}-${process.arch} bun ${Bun.version} node ${nodeVersion} commander ${commanderVersion} commit ${commit} runs ${runs} -->`,
  '| What | Mean ± stddev | Peak memory | Size |',
  '| --- | --- | --- | --- |',
  ...rows,
].join('\n');
await Bun.write(join(WORK, 'result.md'), `${table}\n`);
console.log(`\n${table}`);
