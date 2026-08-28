#!/usr/bin/env bun
/**
 * バージョンを時刻から決める (CalVer `YYYY.MMdd.HHmm`、UTC)。
 *
 *   bun scripts/next-version.ts           番号を出すだけ
 *   bun scripts/next-version.ts --write   package.json と app/version.tsx を書き換える
 *
 * 時刻だけで決まるので、公開済みの一覧を調べる必要がない。
 * 番号は単調に増え、衝突もしない (同じ分に 2 回出さない限り)。
 *
 * `yyyy.MM.dd.HHmm` の 4 つ組にしないのは、npm がそれを
 * `2026.8.2-8.1430` という**プレリリース**として解釈してしまうため
 * (実測。エラーにはならず、通常のインストールで拾われなくなる)。
 */

/** 日付と時刻を 3 つ組に畳んだ形。先頭ゼロは semver で不正なので付けない */
export const CALVER = /^(\d{4})\.(\d{3,4})\.(\d{1,4})$/;

/** その文字列が this の形式として妥当か (月日と時分の範囲まで見る) */
export function isCalVer(version: string): boolean {
  const match = CALVER.exec(version);
  if (match === null) return false;
  // 先頭ゼロは semver として不正 (npm が黙って解釈を変える)
  if (match.slice(1).some((part) => part.length > 1 && part.startsWith('0'))) {
    return false;
  }

  const date = Number(match[2]);
  const time = Number(match[3]);
  const month = Math.floor(date / 100);
  const day = date % 100;
  const hour = Math.floor(time / 100);
  const minute = time % 100;

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

/**
 * @param now 基準にする時刻。`Temporal.ZonedDateTime` なので、どの時間帯で
 *   読むかが値そのものに入っている (`Date` のように getUTC* を呼び忘れる余地がない)
 */
export function calver(now: Temporal.ZonedDateTime): string {
  const date = now.month * 100 + now.day;
  const time = now.hour * 100 + now.minute;
  return `${now.year}.${date}.${time}`;
}

if (import.meta.main) {
  // UTC で決める。手元と CI で番号がぶれないため
  const version = calver(Temporal.Now.zonedDateTimeISO('UTC'));

  if (process.argv.includes('--write')) {
    const manifest = await Bun.file('package.json').text();
    await Bun.write(
      'package.json',
      manifest.replace(/"version": "[^"]*"/, `"version": "${version}"`)
    );
    // サンプルはこのリポジトリ自身の CLI なので合わせる
    const sample = await Bun.file('app/version.tsx').text();
    await Bun.write(
      'app/version.tsx',
      sample.replace(/version="[^"]*"/, `version="${version}"`)
    );
  }

  console.log(version);
}
