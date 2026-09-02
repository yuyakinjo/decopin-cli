/**
 * 副作用のポリシー (ADR 34)。
 *
 * 申告はさせない (ADR 32)。あるのは strict だけで、解析が `none` を名乗れない
 * (`unknown`) コマンドをビルドエラーにする。受け入れるコマンドは
 * `export const unsafeEval = true` を cmd.tsx に書く。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acceptsUnknown } from '../../src/build/effects.ts';
import { generate } from '../../src/build/index.ts';

let root: string;
let appDir: string;
let workDir: string;

async function command(name: string, source: string) {
  await mkdir(join(appDir, name), { recursive: true });
  await writeFile(join(appDir, name, 'cmd.tsx'), source);
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'decopin-policy-'));
  appDir = join(root, 'app');
  workDir = join(root, '.decopin');
  await writeFile(join(root, 'evil.ts'), "export const e = () => eval('1');\n");
  await command('pure', 'export default () => "hi";\n');
  await command(
    'sneaky',
    "import { e } from '../../evil.ts';\nexport default () => String(e());\n"
  );
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('strict でないなら通る (既定)', () => {
  test('unknown があっても報告するだけ', async () => {
    const result = await generate({ appDir, workDir });
    expect(result.effects.get('sneaky')?.effects.network).toBe('unknown');
  });
});

describe('strict', () => {
  test('unknown のコマンドを、何に当たったかと経路つきで拒む', async () => {
    const failure = await generate({
      appDir,
      workDir,
      strictEffects: true,
    }).then(
      () => undefined,
      (error: Error) => error.message
    );
    expect(failure).toContain('Effects could not be verified:');
    expect(failure).toContain('sneaky: analysis gave up');
    expect(failure).toContain('eval: ');
    expect(failure).toContain('cmd.tsx -> ');
    expect(failure).toContain('evil.ts');
    expect(failure).toContain('export const unsafeEval = true');
    // 問題のないコマンドは名指ししない
    expect(failure).not.toContain('pure');
  });

  test('unsafeEval を export したコマンドは通る (unknown のまま、hint は出ない)', async () => {
    await command(
      'sneaky',
      "import { e } from '../../evil.ts';\nexport const unsafeEval = true;\nexport default () => String(e());\n"
    );
    const result = await generate({ appDir, workDir, strictEffects: true });
    expect(result.effects.get('sneaky')?.effects.network).toBe('unknown');
  });
});

describe('acceptsUnknown', () => {
  test('export const unsafeEval = true だけを見る。文字列やコメントの中は数えない', async () => {
    const file = join(root, 'probe.tsx');
    await writeFile(
      file,
      '// export const unsafeEval = true\nexport default 1;\n'
    );
    expect(await acceptsUnknown(file)).toBe(false);
    await writeFile(file, 'export const unsafeEval = false;\n');
    expect(await acceptsUnknown(file)).toBe(false);
    await writeFile(file, 'export const unsafeEval = true;\n');
    expect(await acceptsUnknown(file)).toBe(true);
    expect(await acceptsUnknown(join(root, 'missing.tsx'))).toBe(false);
  });
});
