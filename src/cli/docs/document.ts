/**
 * `app/` の構造から、読み物としてのドキュメントを組み立てる (Issue #3)。
 *
 * core ではなく cli に置いてある。argv・example・help の規約を読む以上、
 * core に置くと ADR 41「core は features を呼ばない」を破る。使うのは
 * `decopin docs` だけなので、cli/gen/generate.ts と同じ形にした。
 *
 * help との境界: help は**打っている人**が今このコマンドの呼び方を知るための
 * もので、1 コマンド分・その場限り。docs は**まだ打っていない人**が全体を
 * 見渡すためのもので、返ってくる出力まで含めて残る。
 *
 * 出力を載せるために例を**実際に実行する**。走らせるのは `example.tsx` で
 * 宣言された例だけで、宣言のないコマンドには触らない。ドキュメントを作る
 * だけで副作用が起きると、読むことが危険になる。
 */
import { resolve } from 'node:path';

import { build } from '../../core/build/index.ts';
import type { BuildOptions } from '../../core/build/index.ts';
import type { Route } from '../../core/build/scanner.ts';
import { typeLabel } from '../../core/types/type-node.ts';
import { loadArgvSpec } from '../../features/conventions/argv/runtime.ts';
import type { ArgvSpec } from '../../features/conventions/argv/spec.ts';
import { loadExamples } from '../../features/conventions/example/runtime.ts';
import type { CommandExample } from '../../features/conventions/example/runtime.ts';
import {
  argUsage,
  optionLabel,
} from '../../features/conventions/help/runtime.tsx';

export interface DocsOptions extends BuildOptions {
  /**
   * 例を実行する。既定は true。
   *
   * false にすると使い方だけを出す。「実行結果は要らない」ではなく
   * 「今は走らせられない」場面 (オフライン、権限が無い) のための逃げ道
   */
  run?: boolean;
}

/** 例を 1 つ実行した結果 */
export interface ExampleRun {
  /** 打った行そのもの (`cli hello world`) */
  command: string;
  description?: string;
  /** stdout と stderr を打った順のまま。端末で見えるものと同じ */
  output: string;
  exitCode: number;
  /** 走らせていない (run: false、または宣言が無い) */
  skipped: boolean;
}

export interface CommandDoc {
  /** コマンド名。ルートコマンドは空文字 */
  name: string;
  description?: string;
  spec: ArgvSpec;
  /** example.tsx が宣言していた例。無ければ空 */
  examples: CommandExample[];
  runs: ExampleRun[];
}

export interface DocsResult {
  program: string;
  commands: CommandDoc[];
  markdown: string;
}

/** 規約ファイルを読む。パスはプロジェクトルートからの相対で来る */
function loader(
  file: string | undefined
): (() => Promise<unknown>) | undefined {
  if (file === undefined) return undefined;
  return () => import(resolve(file));
}

/** そのコマンドを打つときの 1 行 */
function usageLine(program: string, name: string, spec: ArgvSpec): string {
  const visible = spec.options.filter((option) => !option.hidden);
  return [
    program,
    ...(name === '' ? [] : name.split('/')),
    ...spec.args.map(argUsage),
    ...visible.map((option) =>
      option.required ? optionLabel(option) : `[${optionLabel(option).trim()}]`
    ),
  ].join(' ');
}

function table(header: readonly string[], rows: readonly string[][]): string {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
    '',
  ].join('\n');
}

/** 表の中で改行やパイプが崩れないようにする。全ての列がここを通る */
function cell(value: string | undefined): string {
  if (value === undefined || value === '') return '';
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function fence(body: string): string {
  // 出力に囲み記号が現れても閉じないよう、必要なら囲みを伸ばす。
  // 正規表現を使わないのは、囲み記号そのものを探すため (ADR 14 の検査は
  // 素朴な字句解析で、正規表現リテラルの中の引用符を文字列の開始と読む)
  const TICK = '`';
  let longest = 2;
  let run = 0;
  for (const char of body) {
    if (char === TICK) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  const wrap = TICK.repeat(longest + 1);
  return `${wrap}\n${body.endsWith('\n') ? body : `${body}\n`}${wrap}\n`;
}

/** 見出しへのリンク先 (GitHub の付け方に合わせる) */
function anchor(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[^\w\- ]/g, '')
    .replaceAll(' ', '-');
}

function displayName(program: string, name: string): string {
  return name === '' ? program : `${program} ${name.replaceAll('/', ' ')}`;
}

/** 例を 1 つ走らせる。失敗しても投げない — 失敗も載せるものだから */
async function runExample(
  bundle: string,
  program: string,
  name: string,
  example: CommandExample
): Promise<ExampleRun> {
  const argv = [...(name === '' ? [] : name.split('/')), ...example.args];
  const proc = Bun.spawn(['bun', bundle, ...argv], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return {
    command: [program, ...argv].join(' '),
    description: example.description,
    output: `${stdout}${stderr}`,
    exitCode,
    skipped: false,
  };
}

function renderCommand(program: string, doc: CommandDoc): string {
  const title = displayName(program, doc.name);
  const parts = [`## \`${title}\`\n`];
  if (doc.description !== undefined) parts.push(`${doc.description}\n`);
  parts.push('### Usage\n', fence(usageLine(program, doc.name, doc.spec)));

  if (doc.spec.args.length > 0) {
    parts.push(
      '### Arguments\n',
      table(
        ['Argument', 'Type', 'Required', 'Default', 'Description'],
        doc.spec.args.map((arg) => [
          `\`${argUsage(arg)}\``,
          typeLabel(arg.type),
          arg.required ? 'yes' : 'no',
          arg.defaultValue === undefined
            ? ''
            : `\`${JSON.stringify(arg.defaultValue)}\``,
          arg.description ?? '',
        ])
      )
    );
  }

  const options = doc.spec.options.filter((option) => !option.hidden);
  if (options.length > 0) {
    parts.push(
      '### Options\n',
      table(
        ['Option', 'Type', 'Required', 'Default', 'Description'],
        options.map((option) => [
          `\`${optionLabel(option).trim()}\``,
          typeLabel(option.type),
          option.required ? 'yes' : 'no',
          option.defaultValue === undefined
            ? ''
            : `\`${JSON.stringify(option.defaultValue)}\``,
          option.description ?? '',
        ])
      )
    );
  }

  if (doc.runs.length > 0) {
    parts.push('### Examples\n');
    for (const run of doc.runs) {
      if (run.description !== undefined) parts.push(`${run.description}\n`);
      parts.push(fence(`$ ${run.command}`));
      if (run.skipped) {
        parts.push('_not run_\n');
        continue;
      }
      // 失敗を成功に見せない。終了コードは 0 でないときだけ出す
      if (run.exitCode !== 0) {
        parts.push(`**failed (exit ${run.exitCode})**\n`);
      }
      if (run.output !== '') parts.push(fence(run.output));
    }
  }
  return parts.join('\n');
}

function renderMarkdown(
  program: string,
  commands: readonly CommandDoc[]
): string {
  const list = commands.map((doc) => {
    const title = displayName(program, doc.name);
    const summary =
      doc.description === undefined ? '' : ` — ${cell(doc.description)}`;
    return `- [\`${title}\`](#${anchor(title)})${summary}`;
  });
  return [
    `# ${program}\n`,
    '## Commands\n',
    `${list.join('\n')}\n`,
    ...commands.map((doc) => renderCommand(program, doc)),
  ].join('\n');
}

/**
 * app/ を読み、必要なら例を実行して、Markdown を組み立てる。
 *
 * 例の実行はバンドルしたものを別プロセスで叩く。利用者が実際に打つ経路と
 * 同じものを通すためで、ここを in-process にすると「docs では動くのに
 * 打つと動かない」を作れてしまう
 */
export async function documentApp(
  options: DocsOptions = {}
): Promise<DocsResult> {
  const built = await build(options);
  const shouldRun = options.run ?? true;
  const routes = [...built.routes].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );

  const commands: CommandDoc[] = [];
  for (const route of routes as Route[]) {
    const spec = await loadArgvSpec(loader(route.files.argv));
    const examples = await loadExamples(
      loader(route.files.example),
      route.files.example
    );
    const runs: ExampleRun[] = [];
    for (const example of examples) {
      runs.push(
        shouldRun
          ? await runExample(built.outPath, built.program, route.name, example)
          : {
              command: [
                built.program,
                ...(route.name === '' ? [] : route.name.split('/')),
                ...example.args,
              ].join(' '),
              description: example.description,
              output: '',
              exitCode: 0,
              skipped: true,
            }
      );
    }
    commands.push({
      name: route.name,
      description: spec.description,
      spec,
      examples,
      runs,
    });
  }

  return {
    program: built.program,
    commands,
    markdown: renderMarkdown(built.program, commands),
  };
}
