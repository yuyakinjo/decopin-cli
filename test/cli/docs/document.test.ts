/**
 * `decopin docs` の本体 documentApp() (src/cli/docs/document.ts)。
 *
 * 組み立てた Markdown の細部 — 表の中のパイプと改行の逃がし方、隠した
 * オプションを出さないこと、ルートコマンドの見出し、必須の書き分け、
 * 出力に囲み記号が現れたときの囲みの伸ばし方、走らせない例の見せ方 — を見る。
 * 例の実行や失敗の載せ方そのものは test/intent/docs/ の側にある。
 *
 * 生成される entry.ts が `import { run } from 'decopin-cli'` を含むので、
 * 作業場はリポジトリ配下に置く
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { documentApp } from '../../../src/cli/docs/document.ts';
import type { DocsResult } from '../../../src/cli/docs/document.ts';

let root: string;
let skipped: DocsResult;
let ran: DocsResult;

beforeAll(async () => {
  root = await mkdtemp(join(process.cwd(), '.decopin-test-docs-unit-'));
  const appDir = join(root, 'app');
  await mkdir(join(appDir, 'deploy'), { recursive: true });

  // ルートコマンド。説明にパイプと改行を含める
  await writeFile(
    join(appDir, 'argv.tsx'),
    `import { Argv } from 'decopin-cli';

export default function DefineArgv() {
  return <Argv description={"Root | pipe\\nsecond line"} />;
}
`
  );
  await writeFile(
    join(appDir, 'cmd.tsx'),
    'export default function Command() {\n  return null;\n}\n'
  );

  // 必須の引数・必須のオプション・隠したオプション・表を壊しうる説明
  await writeFile(
    join(appDir, 'deploy/argv.tsx'),
    `import { Arg, Argv, Option } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Deploy it.">
      <Arg name="target" type="string" required description="where to" />
      <Option name="token" type="string" required description="api token" />
      <Option name="note" type="string" default="a|b" description={"x | y\\nz"} />
      <Option name="secret" type="string" hidden description="do not show" />
    </Argv>
  );
}
`
  );
  // 出力に囲み記号 (3 連のバッククォート) を含める
  await writeFile(
    join(appDir, 'deploy/cmd.tsx'),
    `import { Line } from 'decopin-cli';

export default function Command() {
  return <Line>{'\`\`\`js'}</Line>;
}
`
  );
  await writeFile(
    join(appDir, 'deploy/example.tsx'),
    `import type { CommandExample } from 'decopin-cli';

export default function Example(): CommandExample[] {
  return [{ args: ['prod', '--token', 't'], description: 'Deploy to prod.' }];
}
`
  );

  const options = {
    appDir,
    workDir: join(root, 'work'),
    outDir: join(root, 'dist'),
    program: 'cli',
  };
  skipped = await documentApp({ ...options, run: false });
  ran = await documentApp(options);
}, 120_000);

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/** `## \`cli deploy\`` から次の `## ` までを取り出す */
function section(markdown: string, title: string): string {
  const start = markdown.indexOf(`## \`${title}\`\n`);
  expect(start).not.toBe(-1);
  const next = markdown.indexOf('\n## ', start + 1);
  return next === -1 ? markdown.slice(start) : markdown.slice(start, next);
}

describe('一覧と見出し', () => {
  test('コマンドは名前順で、ルートコマンドは program 名で出す', () => {
    expect(skipped.commands.map((command) => command.name)).toEqual([
      '',
      'deploy',
    ]);
    expect(skipped.markdown).toStartWith('# cli\n\n## Commands\n');
    expect(skipped.markdown).toContain('## `cli`\n');
  });

  test('一覧の説明はパイプを逃がし、改行を空白にして 1 行に収める', () => {
    expect(skipped.markdown).toContain(
      '- [`cli`](#cli) — Root \\| pipe second line\n'
    );
  });

  test('見出しの下の説明は表ではないので、そのまま載せる', () => {
    expect(section(skipped.markdown, 'cli')).toContain(
      'Root | pipe\nsecond line\n'
    );
  });

  test('引数もオプションも無いコマンドには表を出さない', () => {
    const root = section(skipped.markdown, 'cli');
    expect(root).not.toContain('### Arguments');
    expect(root).not.toContain('### Options');
    expect(root).not.toContain('### Examples');
  });
});

describe('表', () => {
  test('必須の引数は <name> で、必須かどうかと説明を並べる', () => {
    expect(skipped.markdown).toContain(
      '| `<target>` | string | yes |  | where to |\n'
    );
  });

  test('既定値は JSON で、説明と既定値の中のパイプと改行も逃がす', () => {
    expect(skipped.markdown).toContain(
      '| `--note <string>` | string | no | `"a\\|b"` | x \\| y z |\n'
    );
  });

  test('hidden のオプションは表にも使い方にも出さない', () => {
    expect(skipped.markdown).not.toContain('secret');
    expect(skipped.markdown).not.toContain('do not show');
    // spec には残っている (隠すのは文書の側の判断)
    const deploy = skipped.commands.find(
      (command) => command.name === 'deploy'
    );
    expect(deploy?.spec.options.map((option) => option.name)).toContain(
      'secret'
    );
  });

  test('使い方の行は、任意のオプションだけを [] で囲む', () => {
    const usage = section(skipped.markdown, 'cli deploy');
    expect(usage).toContain('[--note <string>]');
    expect(usage).not.toContain('[--token');
  });

  // optionLabel() は表のために桁揃えの空白を持つので、使い方の行では落とす
  test('使い方の行は 1 つの空白で区切る (必須オプションも)', () => {
    expect(section(skipped.markdown, 'cli deploy')).toContain(
      '```\ncli deploy <target> --token <string> [--note <string>]\n```\n'
    );
  });
});

describe('例', () => {
  test('run: false なら打つ行だけを載せ、_not run_ と書いて出力を載せない', () => {
    const deploy = skipped.commands.find(
      (command) => command.name === 'deploy'
    );
    expect(deploy?.runs).toEqual([
      {
        command: 'cli deploy prod --token t',
        description: 'Deploy to prod.',
        output: '',
        exitCode: 0,
        skipped: true,
      },
    ]);
    expect(section(skipped.markdown, 'cli deploy')).toContain(
      'Deploy to prod.\n\n```\n$ cli deploy prod --token t\n```\n\n_not run_\n'
    );
  });

  test('出力に ``` が現れたら、囲みを 1 本長くして閉じないようにする', () => {
    const deploy = ran.commands.find((command) => command.name === 'deploy');
    expect(deploy?.runs[0]?.output).toBe('```js\n');
    expect(deploy?.runs[0]?.exitCode).toBe(0);
    expect(section(ran.markdown, 'cli deploy')).toContain(
      '````\n```js\n````\n'
    );
    // 成功した例には失敗の印も _not run_ も付けない
    expect(ran.markdown).not.toContain('failed (exit');
    expect(ran.markdown).not.toContain('_not run_');
  });
});
