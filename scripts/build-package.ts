#!/usr/bin/env bun
/**
 * npm に publish する中身を `publish/` に組み立てる。
 *
 *   bun run build:package
 *
 * リポジトリの package.json は開発用 (exports が `src/*.ts` を指す) のまま
 * 触らない。publishConfig では exports / bin を差し替えられないことを実測で
 * 確認したので、**公開用のディレクトリを別に作る**方式にしている。
 *
 * 中身は tsc が出す (JS と .d.ts をファイル構成のまま)。バンドルしないのは、
 * 利用者が一部だけ import したときに全部を読み込ませないため。
 */
import { rm } from 'node:fs/promises';

const OUT = 'publish';

interface Manifest {
  name: string;
  version: string;
  description: string;
  license: string;
  type: string;
  engines?: Record<string, string>;
  keywords?: string[];
  repository?: unknown;
  dependencies?: Record<string, string>;
}

const source = (await Bun.file('package.json').json()) as Manifest;

await rm(OUT, { recursive: true, force: true });

// JS と .d.ts を出す (tsconfig.lib.json の outDir が publish/lib)
const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.lib.json'], {
  stdout: 'inherit',
  stderr: 'inherit',
});
if ((await tsc.exited) !== 0) {
  console.error('failed to emit lib');
  process.exit(1);
}

/** 公開する package.json。lib を指し、開発用の設定は持ち込まない */
const manifest = {
  name: source.name,
  version: source.version,
  description: source.description,
  license: source.license,
  type: source.type,
  engines: source.engines,
  keywords: source.keywords,
  repository: source.repository,
  exports: {
    '.': { types: './lib/index.d.ts', import: './lib/index.js' },
    './jsx/jsx-runtime': {
      types: './lib/core/jsx/jsx-runtime.d.ts',
      import: './lib/core/jsx/jsx-runtime.js',
    },
    './jsx/jsx-dev-runtime': {
      types: './lib/core/jsx/jsx-dev-runtime.d.ts',
      import: './lib/core/jsx/jsx-dev-runtime.js',
    },
    './build': {
      types: './lib/core/build/index.d.ts',
      import: './lib/core/build/index.js',
    },
  },
  bin: { decopin: './lib/cli/bin.js' },
  files: ['lib', 'README.md', 'LICENSE'],
  dependencies: source.dependencies,
};

await Bun.write(
  `${OUT}/package.json`,
  `${JSON.stringify(manifest, null, 2)}\n`
);
for (const file of ['README.md', 'LICENSE']) {
  await Bun.write(`${OUT}/${file}`, Bun.file(file));
}

// 参照先が本当にあるかを、組み立てた側で確かめる
const missing: string[] = [];
for (const entry of Object.values(manifest.exports)) {
  for (const path of Object.values(entry)) {
    if (!(await Bun.file(`${OUT}/${path}`).exists())) missing.push(path);
  }
}
if (!(await Bun.file(`${OUT}/${manifest.bin.decopin}`).exists())) {
  missing.push(manifest.bin.decopin);
}
if (missing.length > 0) {
  console.error(`missing files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`${OUT}/ is ready (${manifest.name}@${manifest.version})`);
