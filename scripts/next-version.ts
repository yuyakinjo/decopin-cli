#!/usr/bin/env bun
/**
 * 次のバージョンを日付から決める (CalVer `YYYY.MM.PATCH`)。
 *
 *   bun scripts/next-version.ts           次の番号を出すだけ
 *   bun scripts/next-version.ts --write   package.json と app/version.tsx を書き換える
 *
 * PATCH は「その年月に何回目か」。公開済みの一覧は npm レジストリから取る
 * (git のタグは消せるが、公開したものは消せないため)。
 */

/** npm が受け付ける形。先頭ゼロは semver として不正なので付けない */
export const CALVER = /^(\d{4})\.(1[0-2]|[1-9])\.(\d+)$/;

/**
 * @param published すでに公開されているバージョン
 * @param now 基準にする日時
 */
export function nextVersion(published: readonly string[], now: Date): string {
  const prefix = `${now.getFullYear()}.${now.getMonth() + 1}`;
  let highest = -1;
  for (const version of published) {
    const match = CALVER.exec(version);
    if (match === null) continue;
    if (`${match[1]}.${match[2]}` !== prefix) continue;
    highest = Math.max(highest, Number(match[3]));
  }
  return `${prefix}.${highest + 1}`;
}

/** 公開済みの一覧。まだ 1 度も公開していなければ空 */
export async function publishedVersions(name: string): Promise<string[]> {
  const response = await fetch(`https://registry.npmjs.org/${name}`);
  if (!response.ok) return [];
  const body = (await response.json()) as {
    versions?: Record<string, unknown>;
  };
  return Object.keys(body.versions ?? {});
}

if (import.meta.main) {
  const manifest = (await Bun.file('package.json').json()) as { name: string };
  const version = nextVersion(
    await publishedVersions(manifest.name),
    new Date()
  );

  if (process.argv.includes('--write')) {
    const source = await Bun.file('package.json').text();
    await Bun.write(
      'package.json',
      source.replace(/"version": "[^"]*"/, `"version": "${version}"`)
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
