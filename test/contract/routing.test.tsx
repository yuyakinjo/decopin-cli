/**
 * 契約: ルート解決と、その結果の出力先・終了コード。
 *
 * 原則: **明示的に --help を求められたら stdout + exit 0、
 * コマンドが確定しないまま終わったら stderr + exit 2** (使い方の誤り)。
 */
import { describe, expect, test } from 'bun:test';

import { Line, run } from 'decopin-cli';
import type { RouteTable } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

function loader(value: unknown) {
  return async () => ({ default: value });
}

async function invoke(table: RouteTable, argv: string[]) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

/** hello と user 配下 2 つ。`user` 自身は command を持たない */
const TABLE: RouteTable = {
  hello: { command: loader(() => <Line>hello</Line>) },
  'user/list': { command: loader(() => <Line>alice</Line>) },
  'user/import': { command: loader(() => <Line>imported</Line>) },
};

/** ルートコマンドを持つ CLI (単一コマンドの形) */
const WITH_ROOT: RouteTable = {
  ...TABLE,
  '': { command: loader(() => <Line>root</Line>) },
};

interface Expectation {
  /** どちらの fd に出るか */
  fd: 'stdout' | 'stderr';
  code: number;
  /** 出力に含まれるべき文字列 */
  contains: string;
}

const MATRIX: [
  入力: string,
  table: RouteTable,
  argv: string[],
  expected: Expectation,
][] = [
  [
    'cli hello (コマンドあり)',
    TABLE,
    ['hello'],
    { fd: 'stdout', code: 0, contains: 'hello' },
  ],
  [
    'cli hello --help',
    TABLE,
    ['hello', '--help'],
    { fd: 'stdout', code: 0, contains: 'Usage: cli hello' },
  ],
  [
    'cli (引数なし・ルートコマンドなし)',
    TABLE,
    [],
    { fd: 'stderr', code: 2, contains: 'Usage: cli <command> [options]' },
  ],
  [
    'cli --help',
    TABLE,
    ['--help'],
    { fd: 'stdout', code: 0, contains: 'Usage: cli <command> [options]' },
  ],
  [
    'cli user (command.tsx なし・子あり)',
    TABLE,
    ['user'],
    { fd: 'stderr', code: 2, contains: 'Usage: cli user <command> [options]' },
  ],
  [
    'cli user --help',
    TABLE,
    ['user', '--help'],
    { fd: 'stdout', code: 0, contains: 'Usage: cli user <command> [options]' },
  ],
  [
    'cli user list (最長一致)',
    TABLE,
    ['user', 'list'],
    { fd: 'stdout', code: 0, contains: 'alice' },
  ],
  [
    'cli nope (どこにも一致しない)',
    TABLE,
    ['nope'],
    { fd: 'stderr', code: 2, contains: 'Unknown command: nope' },
  ],
  [
    'cli helo (打ち間違い)',
    TABLE,
    ['helo'],
    { fd: 'stderr', code: 2, contains: 'Did you mean: hello' },
  ],
  [
    'cli (ルートコマンドあり)',
    WITH_ROOT,
    [],
    { fd: 'stdout', code: 0, contains: 'root' },
  ],
  [
    'cli nope (ルートコマンドあり → 位置引数として渡る)',
    WITH_ROOT,
    ['nope'],
    { fd: 'stdout', code: 0, contains: 'root' },
  ],
];

describe('ルート解決の表', () => {
  for (const [label, table, argv, expected] of MATRIX) {
    test(label, async () => {
      const result = await invoke(table, argv);
      expect(result.code).toBe(expected.code);
      expect(result[expected.fd]).toContain(expected.contains);
      // 反対の fd は空 (失敗時に stdout を汚さない / 成功時に stderr を汚さない)
      const other = expected.fd === 'stdout' ? 'stderr' : 'stdout';
      expect(result[other]).toBe('');
    });
  }
});

describe('グループの一覧', () => {
  test('配下だけを、打つべき残りの語で出す', async () => {
    const result = await invoke(TABLE, ['user', '--help']);
    expect(result.stdout).toContain('import');
    expect(result.stdout).toContain('list');
    expect(result.stdout).not.toContain('hello');
    expect(result.stdout).not.toContain('user list');
  });
});
