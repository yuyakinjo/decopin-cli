/**
 * Intent `notice-declaration-mistakes-while-typing` の Evidence (ADR 46)。
 *
 * **Behavior を書いてから実装したので、このファイルは 3 番目に書いた。**
 *
 * 始める前の予想は「waived() が 1 つ出る。型検査が落ちることの証明は
 * tsc を子プロセスで回さないと書けないので、費用を見てから決める」だった。
 * 測った結果、1 プロジェクトあたり数秒で、`test/build/typegen.test.ts` に
 * 同じ形の前例もあった。**waiver は 1 つも要らなかった** (予想が外れた)。
 *
 * 当て木は `test/fixtures/` の専用 tsconfig から検査する。`app/` や
 * `experiments/` に置くと、ルートの `bun run typecheck` が拾ってしまう
 * (ルートの tsconfig は fixtures を exclude している)
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  annotateDeclarations,
  annotateReturnSource,
} from '../../../src/core/build/annotate.ts';
import { generate } from '../../../src/core/build/index.ts';
import { scan } from '../../../src/core/build/scanner.ts';
import { toDocument, toReport } from '../core.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as RETURNS } from './implementation.ts';

const UNTYPED = 'test/fixtures/untyped';
const TYPED = 'test/fixtures/typed';

/** 当て木。キーは書き出すパス、値は中身 */
const PROBES: Record<string, string> = {
  // 型が未生成でも通るもの: 要素を返す宣言と、緩いままの DataResult
  [`${UNTYPED}/returns-ok.tsx`]: `import { Env, Var, type DataResult, type EnvDefinition } from 'decopin-cli';

export function DefineEnv(): EnvDefinition {
  return (
    <Env>
      <Var name="TOKEN" type="string" />
    </Env>
  );
}

export function Data(): DataResult<'stats'> {
  return { whatever: true };
}
`,
  // 要素でないものを返す宣言
  [`${UNTYPED}/returns-ng.tsx`]: `import type { EnvDefinition, VersionDefinition } from 'decopin-cli';

export function DefineEnv(): EnvDefinition {
  return null;
}

export function DefineVersion(): VersionDefinition {
  return '1.0.0';
}
`,
  // 生成後: 宣言どおりの data
  [`${TYPED}/returns-ok.tsx`]: `import type { DataResult } from 'decopin-cli';

export default function Data(): DataResult<'stats'> {
  return { counted: 1, total: 3, files: ['README.md'] };
}
`,
  // 生成後: 宣言と食い違う data
  [`${TYPED}/returns-ng.tsx`]: `import type { DataResult } from 'decopin-cli';

export function WrongType(): DataResult<'stats'> {
  return { counted: '1', total: 3, files: [] };
}

export function Missing(): DataResult<'stats'> {
  return { counted: 1, total: 3 };
}
`,
};

const results = new Map<string, Promise<{ output: string; code: number }>>();

/** 同じプロジェクトを 2 つの Behavior から見るので、1 度だけ走らせる */
function typecheck(project: string): Promise<{ output: string; code: number }> {
  const cached = results.get(project);
  if (cached !== undefined) return cached;
  const running = (async () => {
    const proc = Bun.spawn(['bunx', 'tsc', '--noEmit', '-p', project], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [output, code] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);
    return { output, code };
  })();
  results.set(project, running);
  return running;
}

beforeAll(async () => {
  // DataResults は demo/app の output.tsx から生成される
  await generate({ appDir: 'demo/app', workDir: '.decopin' });
  for (const [path, source] of Object.entries(PROBES)) {
    await writeFile(path, source);
  }
});

const dirs: string[] = [];

afterAll(async () => {
  for (const path of Object.keys(PROBES)) await rm(path, { force: true });
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

/** ファイルの並びから app/ を組み立てる */
async function appDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'decopin-returns-'));
  dirs.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(dir, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await writeFile(absolute, content);
  }
  return dir;
}

describeBehavior(RETURNS, 'declares-what-each-file-returns', () => {
  proves(
    '要素でないものを返すと型検査が落ちる',
    async () => {
      const result = await typecheck(`${UNTYPED}/returns-ng.json`);
      expect(result.code).not.toBe(0);
      // JSX が運べるのは「要素であること」まで (ADR 9)
      expect(result.output).toContain(
        "Type 'null' is not assignable to type 'Element'"
      );
      expect(result.output).toContain(
        "Type 'string' is not assignable to type 'Element'"
      );
    },
    60_000
  );

  proves(
    '要素を返す宣言はそのまま通る',
    async () => {
      const result = await typecheck(`${UNTYPED}/returns.json`);
      expect(result.output).toBe('');
      expect(result.code).toBe(0);
    },
    60_000
  );
});

describeBehavior(RETURNS, 'ties-data-to-output', () => {
  proves(
    'output.tsx の宣言と食い違う data は実行前に落ちる',
    async () => {
      const result = await typecheck(`${TYPED}/returns-ng.json`);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain(
        "Type 'string' is not assignable to type 'number'"
      );
      expect(result.output).toContain("Property 'files' is missing");
    },
    60_000
  );

  proves(
    '宣言どおりの data は通る',
    async () => {
      const result = await typecheck(`${TYPED}/returns.json`);
      expect(result.output).toBe('');
      expect(result.code).toBe(0);
    },
    60_000
  );
});

describeBehavior(RETURNS, 'falls-back-before-generation', () => {
  proves(
    '型が未生成なら DataResult は何でも受け付ける',
    async () => {
      // 同じ当て木の Data() が `{ whatever: true }` を返している
      const result = await typecheck(`${UNTYPED}/returns.json`);
      expect(result.output).toBe('');
      expect(result.code).toBe(0);
    },
    60_000
  );
});

const ENV_SOURCE = [
  "import { Env, Var } from 'decopin-cli';",
  '',
  'export default function DefineEnv() {',
  '  return (',
  '    <Env>',
  '      <Var name="TOKEN" type="string" />',
  '    </Env>',
  '  );',
  '}',
  '',
].join('\n');

describeBehavior(RETURNS, 'annotates-while-developing', () => {
  proves('返り値型と import を書き足す', () => {
    expect(annotateReturnSource(ENV_SOURCE, 'EnvDefinition')).toBe(
      [
        "import { Env, Var, type EnvDefinition } from 'decopin-cli';",
        '',
        'export default function DefineEnv(): EnvDefinition {',
        '  return (',
        '    <Env>',
        '      <Var name="TOKEN" type="string" />',
        '    </Env>',
        '  );',
        '}',
        '',
      ].join('\n')
    );
  });

  proves('async な宣言は Promise に包む', () => {
    const source =
      "import { Output } from 'decopin-cli';\n" +
      'export default async function DefineOutput() {\n' +
      '  return <Output />;\n}\n';
    expect(annotateReturnSource(source, 'OutputDefinition')).toContain(
      'export default async function DefineOutput(): Promise<OutputDefinition> {'
    );
  });

  proves('data.tsx にはコマンド名を型引数で入れる', () => {
    const source =
      'export default function Data() {\n  return { counted: 0 };\n}\n';
    const next = annotateReturnSource(source, 'DataResult', 'stats');
    expect(next).toContain("function Data(): DataResult<'stats'> {");
    expect(next).toContain("import { type DataResult } from 'decopin-cli';");
  });

  proves('宣言ファイルを実際に書き換える', async () => {
    const dir = await appDir({
      'argv.tsx':
        "import { Argv } from 'decopin-cli';\n" +
        'export default function DefineArgv() {\n  return <Argv />;\n}\n',
      'cmd.tsx': 'export default function Command() {\n  return null;\n}\n',
      'env.tsx': ENV_SOURCE,
    });
    const { routes, rootFiles } = await scan(dir);
    const written = await annotateDeclarations(routes, rootFiles);
    expect(written.map((file) => file.replace(`${dir}/`, '')).sort()).toEqual([
      'argv.tsx',
      'env.tsx',
    ]);
    expect(await Bun.file(join(dir, 'env.tsx')).text()).toContain(
      'DefineEnv(): EnvDefinition {'
    );
  });
});

describeBehavior(RETURNS, 'never-touches-annotated-files', () => {
  proves('既に返り値型があるファイルは触らない', () => {
    const source =
      "import { Env, type EnvDefinition } from 'decopin-cli';\n" +
      'export default function DefineEnv(): EnvDefinition {\n' +
      '  return <Env />;\n}\n';
    expect(annotateReturnSource(source, 'EnvDefinition')).toBeUndefined();
  });

  proves('default export でない宣言は触らない', () => {
    const source =
      "import { Env } from 'decopin-cli';\n" +
      'export function DefineEnv() {\n  return <Env />;\n}\n';
    expect(annotateReturnSource(source, 'EnvDefinition')).toBeUndefined();
  });

  proves('関数宣言でない default export は触らない', () => {
    const source =
      "import { Env } from 'decopin-cli';\n" +
      'export default () => <Env />;\n';
    expect(annotateReturnSource(source, 'EnvDefinition')).toBeUndefined();
  });

  proves('対象外のファイルは 1 バイトも変えない', async () => {
    const cmd = 'export default function Command() {\n  return null;\n}\n';
    const help = "export default function Help() {\n  return 'help';\n}\n";
    const dir = await appDir({ 'cmd.tsx': cmd, 'help.tsx': help });
    const { routes, rootFiles } = await scan(dir);
    expect(await annotateDeclarations(routes, rootFiles)).toEqual([]);
    expect(await Bun.file(join(dir, 'cmd.tsx')).text()).toBe(cmd);
    expect(await Bun.file(join(dir, 'help.tsx')).text()).toBe(help);
  });
});

describeBehavior(RETURNS, 'annotates-data-only-when-declared', () => {
  proves('output.tsx が無いコマンドの data.tsx には書かない', async () => {
    const data = 'export default function Data() {\n  return { n: 1 };\n}\n';
    const dir = await appDir({
      'plain/cmd.tsx':
        'export default function Command() {\n  return null;\n}\n',
      'plain/data.tsx': data,
      'declared/cmd.tsx':
        'export default function Command() {\n  return null;\n}\n',
      'declared/data.tsx': data,
      'declared/output.tsx':
        "import { Output } from 'decopin-cli';\n" +
        'export default function DefineOutput() {\n  return <Output />;\n}\n',
    });
    const { routes, rootFiles } = await scan(dir);
    const written = (await annotateDeclarations(routes, rootFiles)).map(
      (file) => file.replace(`${dir}/`, '')
    );
    expect(written).toContain('declared/data.tsx');
    expect(written).not.toContain('plain/data.tsx');
    // 書かなかった方は 1 バイトも変わっていない
    expect(await Bun.file(join(dir, 'plain/data.tsx')).text()).toBe(data);
    expect(await Bun.file(join(dir, 'declared/data.tsx')).text()).toContain(
      "Data(): DataResult<'declared'> {"
    );
  });
});

describe('対応表', () => {
  test('担い手のファイルが実在する', async () => {
    const missing: string[] = [];
    for (const carriers of Object.values(RETURNS.carriers)) {
      for (const carrier of carriers) {
        if (!(await Bun.file(join(process.cwd(), carrier.where)).exists())) {
          missing.push(carrier.where);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ここまでの Evidence でドキュメントが組み立つ', () => {
    const doc = toDocument(toReport(RETURNS));
    expect(doc).toContain('Intent: notice-declaration-mistakes-while-typing');
    expect(doc).not.toContain('✗');
  });
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(RETURNS);
