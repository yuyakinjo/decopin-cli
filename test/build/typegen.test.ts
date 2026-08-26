/**
 * Phase 3.5 の完了条件: `CommandProps<'hello'>` で `args.name` が
 * `string` に解決される。tsc を実際に走らせて確かめる。
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { rm, writeFile } from 'node:fs/promises';

import { generate } from '../../src/build/index.ts';

const PROBE = 'app/_typegen-probe.tsx';

async function typecheck(project?: string) {
  const proc = Bun.spawn(
    [
      'bunx',
      'tsc',
      '--noEmit',
      ...(project === undefined ? [] : ['-p', project]),
    ],
    { stdout: 'pipe', stderr: 'pipe' }
  );
  const [stdout, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  return { output: stdout, code };
}

beforeAll(async () => {
  await generate({ appDir: 'app', workDir: '.decopin' });
});

describe('生成された型', () => {
  test('app/ 全体が生成された型で型検査を通る', async () => {
    const result = await typecheck();
    expect(result.output).toBe('');
    expect(result.code).toBe(0);
  });

  test('args / options の型と、コマンド名の綴りを検査できる', async () => {
    await writeFile(
      PROBE,
      `import { Line, type CommandProps } from 'decopin-cli';
export default function Command({ args, options }: CommandProps<'hello'>) {
  const wrong: number = args.name;
  const missing = options.nosuch;
  const badRoute: CommandProps<'nope'> = {} as never;
  return <Line>{wrong}{String(missing)}{badRoute.cwd}</Line>;
}
`
    );
    try {
      const result = await typecheck();
      expect(result.code).not.toBe(0);
      // args.name は string
      expect(result.output).toContain(
        "Type 'string' is not assignable to type 'number'"
      );
      // 宣言していないオプションは存在しない
      expect(result.output).toContain("Property 'nosuch' does not exist");
      // 綴りの違うコマンド名は弾かれる
      expect(result.output).toContain(
        'Type \'"nope"\' does not satisfy the constraint'
      );
    } finally {
      await rm(PROBE, { force: true });
    }
  }, 30_000);

  test('型が未生成でも CommandProps は緩い型で通る', async () => {
    const result = await typecheck('test/fixtures/untyped/tsconfig.json');
    expect(result.output).toBe('');
    expect(result.code).toBe(0);
  }, 30_000);
});
