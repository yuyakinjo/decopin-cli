#!/usr/bin/env bun
/**
 * 起動時間の計測結果を PR コメントの本文にする (ADR 24)。
 *
 *   bun scripts/bench-report.ts head.json base.json floor.json > report.md
 *
 * 数字を出すのは hyperfine。ここは**組み立てだけ**を持つ純粋な関数なので、
 * ランナーの上で動かさなくてもテストできる。
 */

/** hyperfine の JSON から使う分だけ。時間は秒 */
export interface Measurement {
  mean: number;
  stddev: number;
}

export interface ReportInput {
  /** この PR のビルド */
  head: Measurement;
  /** 比較対象のビルド。base のビルドに失敗したときは undefined */
  base?: Measurement;
  /** 空の Bun バイナリ。ランタイムの固定費 */
  floor: Measurement;
  /** 比較対象のブランチ名 (表示用) */
  baseRef: string;
  runs: number;
}

/** PR コメントを毎回作らず書き換えるための目印 */
export const MARKER = '<!-- decopin-bench -->';

/** 秒 → ミリ秒の表示 */
function ms(seconds: number): string {
  return `${(seconds * 1000).toFixed(1)} ms`;
}

/** 差を符号付きで。改善も退行も同じ形で読めるようにする */
function delta(head: number, base: number): string {
  const diff = (head - base) * 1000;
  const percent = base === 0 ? 0 : ((head - base) / base) * 100;
  const sign = diff >= 0 ? '+' : '-';
  return `${sign}${Math.abs(diff).toFixed(1)} ms (${sign}${Math.abs(percent).toFixed(1)}%)`;
}

/**
 * 本文を組み立てる。
 *
 * 見出しの数字を「decopin の取り分」にしているのは、合計にはランナーの
 * 速さと Bun の起動が混ざるため。固定費を引いた差だけがこの PR の責任
 */
export function benchReport(input: ReportInput): string {
  const { head, base, floor, baseRef, runs } = input;
  const ownHead = head.mean - floor.mean;

  const rows = [
    `| this PR | ${ms(head.mean)} | ${ms(ownHead)} |`,
    base === undefined
      ? `| ${baseRef} | not built | — |`
      : `| ${baseRef} | ${ms(base.mean)} | ${ms(base.mean - floor.mean)} |`,
    `| empty Bun binary (runtime floor) | ${ms(floor.mean)} | — |`,
  ];

  const lines = [
    MARKER,
    '## Startup benchmark',
    '',
    `\`hello world\`, ${runs} warm runs. Both builds are measured in the same`,
    'job on the same runner, so the machine cancels out of the comparison.',
    '',
    '| Build | Mean | Own share |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ];

  if (base === undefined) {
    lines.push(
      `Could not build \`${baseRef}\`, so there is nothing to compare against.`,
      'The numbers above still show what this branch costs.'
    );
  } else {
    lines.push(
      `**Difference: ${delta(head.mean, base.mean)}** against \`${baseRef}\`.`,
      '',
      'Own share is the mean minus the runtime floor — the part this project is',
      'responsible for. CI runners are noisy; read anything under a few percent',
      'as noise rather than a regression.'
    );
  }

  return `${lines.join('\n')}\n`;
}

/** hyperfine の --export-json を読む。最初の 1 件だけ使う */
export function readMeasurement(json: string): Measurement {
  const parsed = JSON.parse(json) as {
    results?: Array<{ mean?: unknown; stddev?: unknown }>;
  };
  const first = parsed.results?.[0];
  if (first === undefined || typeof first.mean !== 'number') {
    throw new Error('hyperfine JSON has no usable result');
  }
  return {
    mean: first.mean,
    stddev: typeof first.stddev === 'number' ? first.stddev : 0,
  };
}

if (import.meta.main) {
  const [headPath, basePath, floorPath] = process.argv.slice(2);
  if (headPath === undefined || floorPath === undefined) {
    console.error(
      'usage: bun scripts/bench-report.ts <head.json> <base.json|-> <floor.json>'
    );
    process.exit(2);
  }

  const read = async (path: string) =>
    readMeasurement(await Bun.file(path).text());

  // base のビルドに失敗した場合は `-` が渡る。比較を諦めても本文は出す
  let base: Measurement | undefined;
  if (basePath !== undefined && basePath !== '-') {
    try {
      base = await read(basePath);
    } catch {
      base = undefined;
    }
  }

  console.log(
    benchReport({
      head: await read(headPath),
      base,
      floor: await read(floorPath),
      baseRef: process.env['BENCH_BASE_REF'] ?? 'base',
      runs: Number(process.env['BENCH_RUNS'] ?? 50),
    })
  );
}
