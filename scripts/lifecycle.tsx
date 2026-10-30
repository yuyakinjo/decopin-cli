#!/usr/bin/env bun
/**
 * 規約ファイルが呼ばれる順番を、実際に `run()` を回して書き出す (#77)。
 *
 *   bun run docs:lifecycle            # project-structure.md の該当節を書き換える
 *   bun run docs:lifecycle --check    # 古ければ落とす (書き換えない)
 *
 * 順番を手で書くと `run.tsx` を直したときに黙って腐るので、全種類の
 * ファイルを置いたアプリを組み、各ファイルが呼ばれた瞬間を記録して並べる。
 * 図は記録の写しなので、順番が変われば図も変わる。
 * test/docs/lifecycle.test.ts が、書き出したものが今の記録と一致するかを見る
 * (ADR 15: 使い方のドキュメントは実行して守る)。
 */
import {
  Arg,
  Argv,
  Env,
  Line,
  notFound,
  Option,
  Output,
  run,
  Shell,
  Stdin,
  Type,
  Var,
  Version,
} from 'decopin-cli';
import type { RouteTable, RunOptions } from 'decopin-cli';

/** 書き換える節の目印。この間だけを生成物として扱う */
export const START = '<!-- lifecycle:start -->';
export const END = '<!-- lifecycle:end -->';

export const DOC = new URL(
  '../site/content/getting-started/project-structure.md',
  import.meta.url
).pathname;

/** 記録の 1 件。middleware は next() の前後を分けて残す */
export interface Step {
  file: string;
  phase?: 'before next()' | 'after next()';
}

export interface Scenario {
  /** 利用者が打つ形 */
  command: string;
  steps: Step[];
}

let steps: Step[] = [];

/** default export が呼ばれたら記録するモジュールを作る */
function traced(file: string, component: (props: never) => unknown) {
  return async () => ({
    default: (props: never) => {
      steps.push({ file });
      return component(props);
    },
  });
}

function middleware(file: string) {
  return async () => ({
    default: async ({ next }: { next: () => Promise<unknown> }) => {
      steps.push({ file, phase: 'before next()' });
      const output = await next();
      steps.push({ file, phase: 'after next()' });
      return output;
    },
  });
}

const view = () => <Line>ok</Line>;

/**
 * 全種類のファイルを置いたアプリ。`app/` と `app/user/` の 2 段に継承する
 * ファイルを置き、どちらが先に呼ばれるかまで見えるようにする
 */
const table: RouteTable = {
  'user/show': {
    cmd: traced('user/show/cmd.tsx', view),
    argv: traced('user/show/argv.tsx', () => (
      <Argv>
        <Arg name="name" type="string" required />
        <Option name="fail" type="boolean" default={false} />
        <Option name="missing" type="boolean" default={false} />
      </Argv>
    )),
    stdin: traced('user/show/stdin.tsx', () => <Stdin mode="text" />),
    data: traced(
      'user/show/data.tsx',
      ({ args, options }: { args: { name: string }; options: never }) => {
        const { fail, missing } = options as Record<string, boolean>;
        if (fail) throw new Error('failed');
        if (missing) notFound({ what: 'user', requested: args.name });
        return { name: args.name };
      }
    ),
    output: traced('user/show/output.tsx', () => (
      <Output>
        <Type.Object>
          <Type.Field name="name" required>
            <Type.String />
          </Type.Field>
        </Type.Object>
      </Output>
    )),
    shell: traced('user/show/shell.tsx', () => (
      <Shell.Export name="LAST_USER" value="alice" />
    )),
    complete: traced('user/show/complete.tsx', () => ['alice']),
    errors: [traced('user/error.tsx', view), traced('error.tsx', view)],
    notFounds: [
      traced('user/not-found.tsx', view),
      traced('not-found.tsx', view),
    ],
    layouts: [
      traced('layout.tsx', ({ children }: { children: unknown }) => children),
      traced(
        'user/layout.tsx',
        ({ children }: { children: unknown }) => children
      ),
    ],
    middlewares: [
      middleware('middleware.tsx'),
      middleware('user/middleware.tsx'),
    ],
  },
};

const options: RunOptions = {
  program: 'cli',
  env: { NO_COLOR: '1' },
  targets: { stdout: { write: () => {} }, stderr: { write: () => {} } },
  stdin: { isTTY: false, read: async () => 'from a pipe\n' },
  envFile: traced('env.tsx', () => (
    <Env>
      <Var name="LOG" type="string" default="info" />
    </Env>
  )),
  versionFile: traced('version.tsx', () => <Version version="1.0.0" />),
  globalError: traced('global-error.tsx', view),
  notFound: traced('not-found.tsx', view),
  helps: { 'user/show': traced('user/show/help.tsx', view) },
};

/** 記録したい打ち方。上から図と表に並ぶ */
const RUNS: string[][] = [
  ['user', 'show', 'alice'],
  ['user', 'show', 'alice', '--json'],
  ['user', 'show', 'alice', '--help'],
  ['user', 'show', 'alice', '--fail'],
  ['user', 'show', 'alice', '--missing'],
  ['nope'],
  ['--version'],
  ['__complete', '--', 'user', 'show', ''],
];

export async function traceLifecycle(): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];
  for (const argv of RUNS) {
    steps = [];
    await run(table, { ...options, argv });
    // 補完は利用者が打つ形ではないので、Tab を押したときの見え方にする
    const shown =
      argv[0] === '__complete'
        ? `${argv.slice(2, -1).join(' ')} <Tab>`
        : argv.join(' ');
    scenarios.push({ command: `cli ${shown}`, steps });
  }
  return scenarios;
}

/** middleware の内側を字下げした縦の並び */
function flow(scenario: Scenario): string {
  const width = Math.max(...scenario.steps.map((step) => step.file.length));
  let depth = 0;
  const lines: string[] = [];
  for (const step of scenario.steps) {
    if (step.phase === 'after next()') depth -= 1;
    const indent = '  '.repeat(depth);
    lines.push(
      step.phase === undefined
        ? `${indent}${step.file}`
        : `${indent}${step.file.padEnd(width + 2 - indent.length)}${step.phase}`
    );
    if (step.phase === 'before next()') depth += 1;
  }
  return lines.join('\n');
}

/** 1 行に収める。middleware は一度だけ出す */
function inline(scenario: Scenario): string {
  if (scenario.steps.length === 0) return 'none';
  return scenario.steps
    .filter((step) => step.phase !== 'after next()')
    .map((step) => `\`${step.file}\``)
    .join(' → ');
}

/** 列幅を揃えた表。bun fmt が整える形と同じにしておく (format:check を通す) */
function markdownTable(
  header: [string, string],
  rows: [string, string][]
): string[] {
  const widths = [0, 1].map((column) =>
    Math.max(...[header, ...rows].map((row) => row[column]!.length))
  );
  const line = (cells: string[]) =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column]!)).join(' | ')} |`;
  return [
    line(header),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map(line),
  ];
}

/** 目印の間に入れる Markdown */
export function renderLifecycle(scenarios: Scenario[]): string {
  const [main, ...others] = scenarios as [Scenario, ...Scenario[]];
  return [
    START,
    '',
    `With every file in place, \`${main.command}\` calls them in this order.`,
    'Paths are relative to `app/`, and the indented part runs inside `next()`:',
    '',
    '```',
    flow(main),
    '```',
    '',
    'Other ways in take a shorter path:',
    '',
    ...markdownTable(
      ['Run', 'Files, in order'],
      others.map((scenario) => [`\`${scenario.command}\``, inline(scenario)])
    ),
    '',
    'Generated by `bun run docs:lifecycle` from an actual run.',
    '',
    END,
  ].join('\n');
}

/** ドキュメントの目印の間を差し替えた全文 */
export function splice(document: string, section: string): string {
  const start = document.indexOf(START);
  const end = document.indexOf(END);
  if (start === -1 || end === -1) {
    throw new Error(`${DOC} needs ${START} and ${END}`);
  }
  return document.slice(0, start) + section + document.slice(end + END.length);
}

if (import.meta.main) {
  const document = await Bun.file(DOC).text();
  const next = splice(document, renderLifecycle(await traceLifecycle()));
  if (process.argv.includes('--check')) {
    if (next !== document) {
      console.error(`${DOC} is out of date. Run: bun run docs:lifecycle`);
      process.exit(1);
    }
  } else if (next !== document) {
    await Bun.write(DOC, next);
  }
}
