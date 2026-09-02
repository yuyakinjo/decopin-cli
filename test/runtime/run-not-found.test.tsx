/**
 * 未知のコマンドの表示 (test/contract/routing.test.tsx)。`app/not-found.tsx` で上書きできる。
 */
import { describe, expect, test } from 'bun:test';

import { Line, List, run, Text } from 'decopin-cli';
import type { NotFoundProps, RouteTable } from 'decopin-cli';

function recorder() {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => chunks.push(chunk),
    get text() {
      return chunks.join('');
    },
  };
}

async function invoke(
  table: RouteTable,
  argv: string[],
  notFound?: () => Promise<unknown>
) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1' },
    program: 'cli',
    notFound,
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

function loader(value: unknown, extra: Record<string, unknown> = {}) {
  return async () => ({ default: value, ...extra });
}

const table: RouteTable = {
  hello: { command: loader(() => <Line>hello</Line>) },
  'user/list': { command: loader(() => <Line>alice</Line>) },
};

describe('組み込みの表示', () => {
  test('候補があれば提案し、stderr + exit 2', async () => {
    const result = await invoke(table, ['helo']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: helo');
    expect(result.stderr).toContain('Did you mean: hello');
  });

  test('候補が無ければコマンド一覧を並べる', async () => {
    const result = await invoke(table, ['zzzzzz']);
    expect(result.stderr).toContain('Available commands: hello, user list');
  });

  test('グループの下の未知のコマンドも拾う', async () => {
    const result = await invoke(table, ['user', 'nope']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Unknown command: user nope');
  });
});

describe('not-found.tsx による上書き', () => {
  const view = ({
    requested,
    suggestion,
    available,
    program,
  }: NotFoundProps) => (
    <>
      <Line>
        <Text bold>{program}</Text>: no such command "{requested}"
      </Line>
      {suggestion === undefined ? (
        <List items={available} />
      ) : (
        <Line>try: {suggestion}</Line>
      )}
    </>
  );

  test('props を受け取って表示を差し替える', async () => {
    const result = await invoke(table, ['helo'], loader(view));
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('cli: no such command "helo"\ntry: hello\n');
  });

  test('候補が無い場合はコマンド名が空白区切りで渡る', async () => {
    const result = await invoke(table, ['zzzzzz'], loader(view));
    expect(result.stderr).toContain('- hello');
    expect(result.stderr).toContain('- user list');
  });

  test('失敗したら組み込みの表示に戻る', async () => {
    const result = await invoke(
      table,
      ['helo'],
      loader(() => {
        throw new Error('broken');
      })
    );
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Unknown command: helo');
  });

  test('コンポーネントを default export していなければ組み込みに戻る', async () => {
    const result = await invoke(table, ['helo'], loader(42));
    expect(result.stderr).toContain('Unknown command: helo');
  });

  test('<Stdout> を使えば stdout にも出せる (終了コードは 2 のまま)', async () => {
    const result = await invoke(
      table,
      ['helo'],
      loader(() => <Line>quiet</Line>)
    );
    expect(result.code).toBe(2);
    expect(result.stderr).toBe('quiet\n');
  });
});
