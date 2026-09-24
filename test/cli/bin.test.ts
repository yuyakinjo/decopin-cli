/**
 * decopin 自身の CLI の振り分けと help (src/cli/bin.ts)。
 *
 * bin.ts は読み込んだ時点で process.exit するので、別プロセスで起動して
 * 終了コードと出力を見る。各コマンドの中身には入らない
 */
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

import { usage as buildUsage } from '../../src/cli/build/cmd.ts';
import { usage as devUsage } from '../../src/cli/dev/cmd.ts';
import { usage as docsUsage } from '../../src/cli/docs/cmd.ts';
import { help as genHelp, usage as genUsage } from '../../src/cli/gen/cmd.ts';
import { usage as initUsage } from '../../src/cli/init/cmd.ts';
import { EXIT_CODE } from '../../src/core/runtime/exit.ts';

const BIN = join(import.meta.dir, '../../src/cli/bin.ts');

async function decopin(...args: string[]) {
  const proc = Bun.spawn(['bun', BIN, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

describe('help', () => {
  test('引数なしなら help を標準出力に出して 0 で終わる', async () => {
    const result = await decopin();
    expect(result.code).toBe(EXIT_CODE.success);
    expect(result.stderr).toBe('');
    expect(result.stdout.startsWith('Usage: decopin <command> [options]')).toBe(
      true
    );
  });

  test('-h と --help はどの位置にあっても help になる', async () => {
    const plain = await decopin();
    for (const args of [['-h'], ['--help'], ['build', '--help']]) {
      const result = await decopin(...args);
      expect(result.code).toBe(EXIT_CODE.success);
      expect(result.stdout).toBe(plain.stdout);
    }
  });

  test('Commands 欄は init, gen, build, dev, docs の順に、各 cmd.ts の usage から組み立てる', async () => {
    const { stdout } = await decopin('--help');
    const entries: [string, typeof initUsage][] = [
      ['init', initUsage],
      ['gen', genUsage],
      ['build', buildUsage],
      ['dev', devUsage],
      ['docs', docsUsage],
    ];
    const expected = entries.flatMap(([name, usage]) => {
      const head = [name, usage.args].filter(Boolean).join(' ');
      const [first, ...rest] = usage.summary.split('\n');
      // 2 行目以降は説明の列 (17 桁目) に揃える
      return [
        `  ${head.padEnd(14)} ${first}`,
        ...rest.map((line) => `${' '.repeat(17)}${line}`),
      ];
    });
    const section = stdout.split('Commands:\n')[1]?.split('\n\nOptions:')[0];
    expect(section?.split('\n')).toEqual(expected);
  });
});

describe('振り分け', () => {
  test('未知のコマンドは stderr に名前と help を出して usage error', async () => {
    const result = await decopin('nope');
    expect(result.code).toBe(EXIT_CODE.usage);
    expect(result.stdout).toBe('');
    expect(result.stderr).toStartWith(
      'Unknown command: nope\n\nUsage: decopin'
    );
  });

  test('gen は --help を自分で扱う (全体の help ではなく gen の help)', async () => {
    const result = await decopin('gen', '--help');
    expect(result.code).toBe(EXIT_CODE.success);
    expect(result.stdout).toBe(genHelp);
  });
});
