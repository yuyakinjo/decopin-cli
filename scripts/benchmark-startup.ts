/**
 * 起動時間を測る (§1 のゴール: 10ms 未満)。
 *
 *   bun run bench            既定の 30 回
 *   bun scripts/benchmark-startup.ts --runs 100
 */
import { build } from '../src/build/index.ts';
import { displayWidth } from '../src/renderer/width.ts';

const runsIndex = process.argv.indexOf('--runs');
const runs = runsIndex === -1 ? 30 : Number(process.argv[runsIndex + 1] ?? 30);

/** bun 自体の起動時間。これを引いた差が decopin の取り分 */
const BASELINE = '/tmp/decopin-baseline.js';
await Bun.write(BASELINE, 'process.exit(0);\n');

const cases: [string, string[]][] = [
  ['hello (argv 検証あり)', ['hello', 'Alice', '--loud']],
  ['hello --help', ['hello', '--help']],
  ['user list (layout + middleware)', ['user', 'list']],
  ['未知のコマンド (exit 2)', ['nope']],
  ['--version', ['--version']],
];

console.log('building...');
const built = await build();
console.log(
  `${built.routes.length} commands, ${(built.bytes / 1024).toFixed(1)} KB\n`
);

/** 1 回実行して、プロセスの生存時間を測る */
async function once(args: string[], entry = built.outPath): Promise<number> {
  const started = performance.now();
  const proc = Bun.spawn(['bun', entry, ...args], {
    stdin: new Blob(['']),
    stdout: 'ignore',
    stderr: 'ignore',
    env: { ...process.env, NO_COLOR: '1' },
  });
  await proc.exited;
  return performance.now() - started;
}

function percentile(sorted: number[], ratio: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[index] as number;
}

async function measure(args: string[], entry?: string) {
  await once(args, entry); // 1 回捨てる (ファイルキャッシュを温める)
  const samples: number[] = [];
  for (let index = 0; index < runs; index += 1) {
    samples.push(await once(args, entry));
  }
  samples.sort((a, b) => a - b);
  return {
    min: percentile(samples, 0),
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
  };
}

const baseline = await measure([], BASELINE);
const rows: Record<string, string>[] = [
  {
    case: '(bun 自体の起動)',
    min: `${baseline.min.toFixed(1)}ms`,
    p50: `${baseline.p50.toFixed(1)}ms`,
    p95: `${baseline.p95.toFixed(1)}ms`,
    own: '-',
  },
];

for (const [label, args] of cases) {
  const result = await measure(args);
  rows.push({
    case: label,
    min: `${result.min.toFixed(1)}ms`,
    p50: `${result.p50.toFixed(1)}ms`,
    p95: `${result.p95.toFixed(1)}ms`,
    // bun の起動を引いた、decopin の取り分
    own: `${(result.p50 - baseline.p50).toFixed(1)}ms`,
  });
}

// 桁揃えは自前の displayWidth で行う (日本語のラベルが混ざるため)
const keys = ['case', 'min', 'p50', 'p95', 'own'] as const;
const widths = keys.map((key) =>
  Math.max(
    displayWidth(key),
    ...rows.map((row) => displayWidth(row[key] as string))
  )
);
const line = (values: string[]): string =>
  values
    .map(
      (value, index) =>
        value + ' '.repeat((widths[index] as number) - displayWidth(value))
    )
    .join('  ');

console.log(line([...keys]));
for (const row of rows) {
  console.log(line(keys.map((key) => row[key] as string)));
}
console.log(
  `\n(${runs} runs each. own = p50 - bun 自体の起動。全体は bun の起動を含む)`
);
