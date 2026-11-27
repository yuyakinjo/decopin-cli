/**
 * 本物のパイプにつないだ process.stdout を、別プロセスで動かして見るための当て木。
 * test/core/renderer/writer.test.ts が、シェルのパイプの手前に置いて使う。
 *
 *   bun test/fixtures/pipe-probe.ts <mode>
 *
 *   drain  小さく 1 回、大きく 3 回書き、最初の 'drain' で exit する。
 *          write() の戻り値は stderr に出す。writeChunk() / drainWrites() が
 *          頼っている Bun の約束 (ADR 54) を、枠組みを通さずに確かめる
 *   raw    生の write() のあとも仕事を続けてから exit する (枠組みを通さない形)
 *   chunk  同じことを writeChunk() + drainWrites() でやる (枠組みを通した形)
 */
import { drainWrites, writeChunk } from '../../src/core/renderer/writer.ts';

/** パイプのバッファ (64KB) に収まらない大きさ。writer.test.ts の BIG と揃える */
const big = `${'x'.repeat(200_000)}\n`;
const mode = process.argv[2];

if (mode === 'drain') {
  const returned = [
    process.stdout.write('small\n'),
    process.stdout.write(big),
    process.stdout.write(big),
    process.stdout.write(big),
  ];
  process.stdout.once('drain', () => {
    console.error(JSON.stringify({ returned }));
    process.exit(0);
  });
} else {
  if (mode === 'raw') process.stdout.write(big);
  else writeChunk(process.stdout, big);

  // コマンドの残りの仕事。この間に読み手が閉じる
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (mode !== 'raw') await drainWrites();
  process.exit(0);
}
