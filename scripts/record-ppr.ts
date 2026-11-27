#!/usr/bin/env bun
/**
 * guides/partial-repainting の GIF を録り直す。
 *
 *   bun scripts/record-ppr.ts             全部
 *   bun scripts/record-ppr.ts deploy      site/demos/ppr/deploy.tape だけ
 *
 * site/demos/ppr/app を .decopin-demo/ に build し、vhs (brew install vhs) で
 * site/demos/ppr/*.tape を再生して site/assets/ppr/*.gif に書き出す。
 * <Dynamic> は stderr が TTY のときだけ描き直すので、本物の端末 (vhs) で録る。
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { build } from '../src/core/build/index.ts';

const ROOT = join(import.meta.dir, '..');
const DEMOS = join(ROOT, 'site/demos/ppr');

if (Bun.which('vhs') === null) {
  console.error('vhs is not installed: brew install vhs');
  process.exit(1);
}

await build({
  appDir: join(DEMOS, 'app'),
  workDir: join(ROOT, '.decopin-demo/gen'),
  outDir: join(ROOT, '.decopin-demo/dist'),
  program: 'mycli',
});

const only = process.argv.slice(2);
const tapes = readdirSync(DEMOS)
  .filter((name) => name.endsWith('.tape'))
  .filter(
    (name) => only.length === 0 || only.includes(name.replace(/\.tape$/, ''))
  );

for (const tape of tapes) {
  console.log(`recording ${tape}...`);
  const proc = Bun.spawn(['vhs', join(DEMOS, tape)], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await proc.exited) !== 0) process.exit(1);
}
