/**
 * README の例が崩れないことを担保する。
 *
 * 仕様書を持たない代わりに、使い方ドキュメントを**実行して**検証する。
 * ここが落ちたら README が嘘をついている。
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from '../../src/core/build/index.ts';

interface Block {
  lang: string;
  code: string;
  /** README の何行目から始まるか (失敗時に探しやすくするため) */
  line: number;
}

const README = 'README.md';

/**
 * import を書いていない断片ブロックに足す import。
 * 「使うと書いてあるものが本当に export されているか」の検査にもなる
 */
const FRAGMENT_IMPORTS = `import {
  Arg,
  Argv,
  Box,
  Br,
  Columns,
  Danger,
  Env,
  Exit,
  Indent,
  Info,
  Json,
  KeyValue,
  Line,
  Link,
  List,
  Option,
  Stderr,
  Stdin,
  Stdout,
  Success,
  Table,
  Text,
  Type,
  Var,
  Version,
  Warn,
} from 'decopin-cli';
`;

/** ```lang ... ``` を取り出す */
function extractBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split('\n');
  let current: Block | undefined;

  for (const [index, line] of lines.entries()) {
    const fence = /^```(\w+)?\s*$/.exec(line);
    if (fence !== null && current === undefined) {
      current = { lang: fence[1] ?? '', code: '', line: index + 1 };
      continue;
    }
    if (line.trim() === '```' && current !== undefined) {
      blocks.push(current);
      current = undefined;
      continue;
    }
    if (current !== undefined) current.code += `${line}\n`;
  }
  return blocks;
}

let source: string;
/** 表の桁揃えに左右されないよう、連続する空白を 1 つに潰したもの */
let normalized: string;
let blocks: Block[];

/** README に (整形の差を無視して) その一節が含まれるか */
function documented(fragment: string): boolean {
  return normalized.includes(fragment.replace(/\s+/g, ' ').trim());
}
let workspace: string;
let cliPath: string;

beforeAll(async () => {
  source = await Bun.file(README).text();
  normalized = source.replace(/[ \t]+/g, ' ');
  blocks = extractBlocks(source);
  workspace = await mkdtemp(join(tmpdir(), 'decopin-readme-'));
  const built = await build({
    appDir: 'app',
    workDir: '.decopin',
    outDir: join(workspace, 'dist'),
  });
  cliPath = built.outPath;
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

/** README に書いてあるコマンドを実際に走らせる */
async function runCli(args: string[], input = '') {
  const proc = Bun.spawn(['bun', cliPath, ...args], {
    stdin: new Blob([input]),
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

describe('README のコードブロック', () => {
  test('tsx のブロックがある', () => {
    expect(
      blocks.filter((block) => block.lang === 'tsx').length
    ).toBeGreaterThan(3);
  });

  test('tsx のブロックが型検査を通る', async () => {
    const tsxBlocks = blocks.filter((block) => block.lang === 'tsx');
    // 'decopin-cli' の自己参照を解決させるため、リポジトリ内に置いて検査する
    const dir = await mkdtemp(join(process.cwd(), '.readme-check-'));
    const files: string[] = [];

    for (const [index, block] of tsxBlocks.entries()) {
      // 断片 (import が無い / JSX だけ) は 1 つの関数に包んで通す
      const isModule = block.code.includes('export default');
      const path = join(dir, `block-${index}.tsx`);
      const body = isModule
        ? block.code
        : `${FRAGMENT_IMPORTS}\nexport function Sample() {\n  return (\n    <>\n${block.code}\n    </>\n  );\n}\n`;
      await writeFile(path, body);
      files.push(path);
    }

    await writeFile(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        extends: '../tsconfig.json',
        compilerOptions: { noEmit: true, types: ['bun'] },
        // 生成された型を読ませる (CommandProps<'hello'> を解決するため)
        include: ['*.tsx', '../.decopin/types.d.ts'],
        exclude: [],
      })
    );

    const proc = Bun.spawn(
      ['bunx', 'tsc', '--noEmit', '-p', join(dir, 'tsconfig.json')],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    const [output, code] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);
    await rm(dir, { recursive: true, force: true });

    if (code !== 0) {
      throw new Error(
        `README の tsx ブロックが型検査に失敗しました:\n${output}`
      );
    }
    expect(files.length).toBeGreaterThan(0);
  }, 60_000);
});

describe('README のシェル実行例', () => {
  test('hello の例が書いてある通りに動く', async () => {
    expect(documented('$ ./dist/index.js hello world')).toBe(true);
    const result = await runCli(['hello', 'world']);
    expect(result.stdout).toBe('hello, world\n');
    expect(result.code).toBe(0);
  });

  test('count の例が書いてある通りに動く', async () => {
    expect(source).toContain(
      "$ printf 'a\\nb\\n\\nc\\n' | ./dist/index.js count"
    );
    const result = await runCli(['count'], 'a\nb\n\nc\n');
    expect(result.stdout).toBe('4\n');
  });

  test('hello --help の出力が README と一致する', async () => {
    const result = await runCli(['hello', '--help']);
    // README の usage 行と Options の各行が実際に出ていること
    for (const line of [
      'Usage: decopin-cli hello [name] [options]',
      'Greet someone.',
      '-l, --loud',
      '-t, --times <number>',
      '-h, --help',
    ]) {
      expect(documented(line)).toBe(true);
      expect(result.stdout).toContain(line);
    }
  });

  test('user (グループ) の出力が README と一致する', async () => {
    const result = await runCli(['user']);
    for (const line of [
      'Usage: decopin-cli user <command> [options]',
      // 一覧には argv.tsx の説明が揃えて付く
      '  import  Import users from JSON on stdin.',
      '  list    List users.',
      'Run "decopin-cli user <command> --help" for details.',
    ]) {
      expect(documented(line)).toBe(true);
      expect(result.stderr).toContain(line);
    }
    // グループの一覧は stderr + exit 2
    expect(result.stdout).toBe('');
    expect(result.code).toBe(2);
  });

  test('README が挙げている app/ のサンプルが実在する', async () => {
    const referenced = [...source.matchAll(/\]\((app\/[a-z/-]+)\)/g)].map(
      (match) => match[1] as string
    );
    expect(referenced.length).toBeGreaterThan(5);
    for (const path of referenced) {
      expect(await Bun.file(join(path, 'cmd.tsx')).exists()).toBe(
        // app/user のようなグループはコマンドを持たない
        path !== 'app/user'
      );
    }
  });

  test('README が挙げている終了コードが実装と一致する', async () => {
    const { EXIT_CODE } = await import('../../src/core/runtime/exit.ts');
    expect(documented('| 130 | Ctrl+C')).toBe(true);
    expect(EXIT_CODE.interrupted).toBe(130);
    expect(EXIT_CODE.usage).toBe(2);
    expect(EXIT_CODE.runtime).toBe(1);
  });
});
