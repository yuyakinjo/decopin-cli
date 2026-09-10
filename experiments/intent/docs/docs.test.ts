/**
 * Intent `know-what-a-command-does-without-running-it` の Evidence。
 *
 * **Behavior を書いてから実装したので、このファイルは 3 番目に書いた。**
 * Intent Recovery のときは「既にあるテストを Behavior に結び直す」作業から
 * 始まったが、ここには結び直す先が無く、全部この Intent のために書いている。
 *
 * 例の実行はバンドルを別プロセスで叩くので、作業場はリポジトリ配下に置く
 * (生成される entry.ts が `import { run } from 'decopin-cli'` を含む)。
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { documentApp } from '../../../src/cli/docs/document.ts';
import type { DocsResult } from '../../../src/cli/docs/document.ts';
import { toDocument, toReport } from '../core.ts';
import { describeBehavior, proves, report } from '../evidence.bun.ts';
import { IMPLEMENTATION as DOCS } from './implementation.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'src/cli/bin.ts');
/** 実行されたら痕跡を残すコマンド。「宣言のないものは走らせない」の証拠になる */
const SENTINEL = 'quiet-was-executed';

let root: string | undefined;

afterAll(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
  root = undefined;
});

/**
 * 3 つのコマンドを持つ作業場。1 度だけ作り、全ての証明で使い回す
 * (documentApp はビルドとバンドルを通るので、毎回作ると遅い)
 */
async function scratch(): Promise<{ appDir: string; workDir: string }> {
  if (root === undefined) {
    root = await mkdtemp(join(REPO, '.decopin-test-docs-'));
    const appDir = join(root, 'app');

    // 例を宣言したコマンド。成功する例と失敗する例を持つ
    await mkdir(join(appDir, 'hello'), { recursive: true });
    await writeFile(
      join(appDir, 'hello/argv.tsx'),
      `import { Arg, Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Greet someone.">
      <Arg name="name" type="string" default="world" description="who to greet" />
      <Option name="times" alias="t" default={1} description="repeat count">
        <Type.Number min={1} max={2} integer />
      </Option>
    </Argv>
  );
}
`
    );
    await writeFile(
      join(appDir, 'hello/cmd.tsx'),
      `import { Line, type CmdProps } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'hello'>) {
  return (
    <>
      {Array.from({ length: options.times }, (_, index) => (
        <Line key={index}>hello, {args.name}</Line>
      ))}
    </>
  );
}
`
    );
    await writeFile(
      join(appDir, 'hello/example.tsx'),
      `import type { CommandExample } from 'decopin-cli';

export default function Example(): CommandExample[] {
  return [
    { args: [], description: 'Greets the world.' },
    { args: ['--times', '9'], description: 'Refuses a value out of range.' },
  ];
}
`
    );

    // 例を宣言していないコマンド。走らせたらファイルを残す
    await mkdir(join(appDir, 'quiet'), { recursive: true });
    await writeFile(
      join(appDir, 'quiet/cmd.tsx'),
      `import { writeFileSync } from 'node:fs';

export default function Command() {
  writeFileSync(${JSON.stringify(join(REPO, '.decopin-test-docs-sentinel'))}, 'ran');
  return null;
}
`
    );

    // 入れ子のコマンド
    await mkdir(join(appDir, 'user/list'), { recursive: true });
    await writeFile(
      join(appDir, 'user/list/argv.tsx'),
      `import { Argv } from 'decopin-cli';

export default function DefineArgv() {
  return <Argv description="List users." />;
}
`
    );
    await writeFile(
      join(appDir, 'user/list/cmd.tsx'),
      `import { Line } from 'decopin-cli';

export default function Command() {
  return <Line>alice</Line>;
}
`
    );
  }
  return { appDir: join(root, 'app'), workDir: join(root, 'work') };
}

let generated: Promise<DocsResult> | undefined;

/** ドキュメントを 1 度だけ組み立てる (例の実行も 1 度で済ませる) */
function document(): Promise<DocsResult> {
  if (generated === undefined) {
    generated = scratch().then(({ appDir, workDir }) =>
      documentApp({
        appDir,
        workDir,
        outDir: join(workDir, 'dist'),
        program: 'cli',
      })
    );
  }
  return generated;
}

describeBehavior(DOCS, 'lists-every-command', () => {
  proves(
    'app/ のコマンドを漏らさず、入れ子は階層のまま並べる',
    async () => {
      const result = await document();
      expect(result.commands.map((command) => command.name)).toEqual([
        'hello',
        'quiet',
        'user/list',
      ]);
      // 一覧は打つときの形で出す (user/list ではなく user list)
      expect(result.markdown).toContain('- [`cli hello`](#cli-hello)');
      expect(result.markdown).toContain('- [`cli user list`](#cli-user-list)');
      expect(result.markdown).toContain('List users.');
    },
    60_000
  );
});

describeBehavior(DOCS, 'shows-how-to-call', () => {
  proves(
    '引数とオプションを、必須か・型・既定値つきで見せる',
    async () => {
      const result = await document();
      expect(result.markdown).toContain(
        'cli hello [name] [-t, --times <number>]'
      );
      // 表の 1 行に、打つ形・型・必須か・既定値・説明が並ぶ
      expect(result.markdown).toContain(
        '| `[name]` | string | no | `"world"` | who to greet |'
      );
      expect(result.markdown).toContain(
        '| `-t, --times <number>` | number | no | `1` | repeat count |'
      );
    },
    60_000
  );
});

describeBehavior(DOCS, 'runs-the-declared-examples', () => {
  proves(
    '宣言された例を実際に実行し、打った行と返ってきた出力を載せる',
    async () => {
      const result = await document();
      const hello = result.commands.find(
        (command) => command.name === 'hello'
      ) as (typeof result.commands)[number];
      expect(hello.runs.map((run) => run.command)).toEqual([
        'cli hello',
        'cli hello --times 9',
      ]);
      // 出力は実行して得たもの。宣言から組み立てたものではない
      expect(hello.runs[0]?.output).toBe('hello, world\n');
      expect(hello.runs[0]?.exitCode).toBe(0);
      expect(result.markdown).toContain('$ cli hello');
      expect(result.markdown).toContain('hello, world');
      expect(result.markdown).toContain('Greets the world.');
    },
    60_000
  );
});

describeBehavior(DOCS, 'only-runs-what-was-declared', () => {
  proves(
    '例が宣言されていないコマンドは実行せず、使い方だけを載せる',
    async () => {
      const result = await document();
      const quiet = result.commands.find(
        (command) => command.name === 'quiet'
      ) as (typeof result.commands)[number];
      expect(quiet.examples).toEqual([]);
      expect(quiet.runs).toEqual([]);
      // 走っていれば痕跡が残る。ドキュメントを作るだけで副作用は起きない
      const trace = join(REPO, `.decopin-test-docs-sentinel`);
      expect(await Bun.file(trace).exists()).toBe(false);
      expect(SENTINEL).toBe('quiet-was-executed');
      // それでも使い方は載る
      expect(result.markdown).toContain('## `cli quiet`');
    },
    60_000
  );
});

describeBehavior(DOCS, 'shows-a-failure-as-a-failure', () => {
  proves(
    '失敗した例は、終了コードと出力をそのまま失敗として載せる',
    async () => {
      const result = await document();
      const hello = result.commands.find(
        (command) => command.name === 'hello'
      ) as (typeof result.commands)[number];
      const failing = hello.runs[1];
      expect(failing?.exitCode).toBe(2);
      expect(failing?.output).toContain('--times');
      // 文書の側でも失敗と分かる。成功した例と同じ見た目にしない
      expect(result.markdown).toContain('**failed (exit 2)**');
      // 1 つ落ちても生成は止まらない
      expect(result.markdown).toContain('## `cli user list`');
    },
    60_000
  );
});

/** CLI を叩く。documentApp と違い、書き先の判断まで含めて見る */
async function docs(args: string[]) {
  const proc = Bun.spawn(['bun', BIN, 'docs', ...args], {
    cwd: REPO,
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

describeBehavior(DOCS, 'writes-where-told', () => {
  proves(
    '既定は標準出力、--out を渡したときだけそのファイルに書く',
    async () => {
      const { appDir, workDir } = await scratch();
      const shared = ['--app', appDir, '--work', join(workDir, 'cli')];

      const printed = await docs([...shared, '--no-run']);
      expect(printed.code).toBe(0);
      expect(printed.stdout).toContain('## Commands');

      const out = join(workDir, 'commands.md');
      const written = await docs([...shared, '--no-run', '--out', out]);
      expect(written.code).toBe(0);
      // 書いたときは標準出力に出さない (パイプの中身を汚さない)
      expect(written.stdout).toBe('');
      expect(written.stderr).toContain(`Wrote ${out}`);
      expect(await Bun.file(out).text()).toBe(printed.stdout);
    },
    120_000
  );
});

/** Graph そのものの検査。Behavior の証明ではないので proves() は使わない */
describe('Intent Graph', () => {
  test('Implementation が指すファイルが実在する', async () => {
    const missing: string[] = [];
    for (const carriers of Object.values(DOCS.carriers)) {
      for (const carrier of carriers) {
        if (!(await Bun.file(join(REPO, carrier.where)).exists())) {
          missing.push(carrier.where);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('ここまでの Evidence でドキュメントが組み立つ', () => {
    const doc = toDocument(toReport(DOCS));
    expect(doc).toContain(
      'Intent: know-what-a-command-does-without-running-it'
    );
    expect(doc).not.toContain('✗');
  });
});

// 全 Behavior が証明されたかを見て、.decopin-intent/ へ書き出す。必ず最後に呼ぶ
report(DOCS);
