#!/usr/bin/env bun
/**
 * 起動時間とバンドルサイズの計測結果を PR コメントの本文にする (ADR 24)。
 *
 *   bun scripts/bench-report.ts head.json base.json floor.json > report.md
 *
 * バンドルサイズは環境変数 BENCH_BYTES_HEAD / BENCH_BYTES_BASE (バイト数) で渡す。
 *
 * 数字を出すのは hyperfine と `decopin build`。ここは**組み立てだけ**を持つ
 * 純粋な関数なので、ランナーの上で動かさなくてもテストできる。
 */

/** hyperfine の JSON から使う分だけ。時間は秒 */
export interface Measurement {
  mean: number;
  stddev: number;
}

/** 最小の CLI (test/fixtures/hello-app) を minify してビルドしたバイト数 */
export interface BundleSize {
  head: number;
  /** base のビルドに失敗したときは undefined */
  base?: number;
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
  /** 省略時はサイズの節を出さない (計測を足す前のジョブでも本文が出る) */
  bundle?: BundleSize;
}

/** PR コメントを毎回作らず書き換えるための目印 */
export const MARKER = '<!-- decopin-bench -->';

/** 秒 → ミリ秒の表示 */
function ms(seconds: number): string {
  return `${(seconds * 1000).toFixed(1)} ms`;
}

/** バイト → KB の表示 */
function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** 差を符号付きで。改善も退行も同じ形で読めるようにする */
function signed(
  diff: number,
  base: number,
  unit: (n: number) => string
): string {
  const percent = base === 0 ? 0 : (diff / base) * 100;
  const sign = diff >= 0 ? '+' : '-';
  return `${sign}${unit(Math.abs(diff))} (${sign}${Math.abs(percent).toFixed(1)}%)`;
}

function delta(head: number, base: number): string {
  return signed(head - base, base, ms);
}

function deltaBytes(head: number, base: number): string {
  return signed(head - base, base, kb);
}

/**
 * 本文を組み立てる。
 *
 * 見出しの数字を「decopin の取り分」にしているのは、合計にはランナーの
 * 速さと Bun の起動が混ざるため。固定費を引いた差だけがこの PR の責任
 */
export function benchReport(input: ReportInput): string {
  const { head, base, floor, baseRef, runs, bundle } = input;
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

  if (bundle !== undefined) {
    lines.push('', ...bundleSection(bundle, baseRef));
  }

  return `${lines.join('\n')}\n`;
}

/**
 * バンドルサイズの節。対象は 1 コマンドで `<Line>` しか使わない最小の CLI
 * なので、ここが増えたらフレームワーク側が増えたということ。
 * 起動時間と違ってバイト数は決定的で、差が出たらそれはノイズではない
 */
function bundleSection(bundle: BundleSize, baseRef: string): string[] {
  const lines = [
    '## Bundle size',
    '',
    'Minimal CLI (`test/fixtures/hello-app`: one command, `<Line>` only),',
    '`decopin build --minify`. Framework code is all of it, so growth here is',
    'framework growth.',
    '',
    '| Build | Size |',
    '| --- | --- |',
    `| this PR | ${kb(bundle.head)} |`,
    bundle.base === undefined
      ? `| ${baseRef} | not built |`
      : `| ${baseRef} | ${kb(bundle.base)} |`,
    '',
  ];
  if (bundle.base !== undefined) {
    lines.push(
      `**Difference: ${deltaBytes(bundle.head, bundle.base)}** against \`${baseRef}\`.`,
      'Bytes are deterministic: any difference is real, not runner noise.'
    );
  }
  return lines;
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

/** 環境変数のバイト数。空や数字以外は「無い」扱い (0 KB として通さない) */
export function readBytes(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const bytes = Number(value);
  return Number.isInteger(bytes) && bytes > 0 ? bytes : undefined;
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

  const bytesHead = readBytes(process.env['BENCH_BYTES_HEAD']);
  const bundle: BundleSize | undefined =
    bytesHead === undefined
      ? undefined
      : { head: bytesHead, base: readBytes(process.env['BENCH_BYTES_BASE']) };

  console.log(
    benchReport({
      head: await read(headPath),
      base,
      floor: await read(floorPath),
      baseRef: process.env['BENCH_BASE_REF'] ?? 'base',
      runs: Number(process.env['BENCH_RUNS'] ?? 50),
      bundle,
    })
  );
}
