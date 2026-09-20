/**
 * `decopin docs` — app/ からドキュメントを組み立てて出す (Issue #3)。
 *
 * 既定は標準出力。書き先を決めるのは使う側なので、`--out` を渡したときだけ
 * ファイルに書く。書いたことは stderr に出す — 標準出力はドキュメントの
 * ためのものなので、パイプの中身を汚さない
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { EXIT_CODE } from '../../core/runtime/exit.ts';
import { hasFlag, optionValue, type Usage } from '../argv.ts';
import { documentApp } from './document.ts';

export const usage: Usage = {
  args: '[--out <file>]',
  summary:
    'write documentation for every command in app/\n(runs the examples declared in example.tsx)',
};

export default async function run(argv: string[]): Promise<number> {
  const out = optionValue(argv, '--out');
  const result = await documentApp({
    appDir: optionValue(argv, '--app'),
    // ドキュメントは dist/ を汚さない場所に組み立てる
    outDir: optionValue(argv, '--dist') ?? '.decopin/docs',
    workDir: optionValue(argv, '--work'),
    run: !hasFlag(argv, '--no-run'),
  });

  if (out === undefined) {
    process.stdout.write(result.markdown);
    return EXIT_CODE.success;
  }
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, result.markdown);
  // 失敗した例は文書にも残るが、書いた直後にも言う。生成が通ったことと
  // 例が通ったことを混ぜない
  const failed = result.commands.flatMap((command) =>
    command.runs.filter((run) => !run.skipped && run.exitCode !== 0)
  ).length;
  const note = failed === 0 ? '' : `, ${failed} failing example(s)`;
  process.stderr.write(
    `[decopin] Wrote ${out} (${result.commands.length} command(s)${note})\n`
  );
  return EXIT_CODE.success;
}
