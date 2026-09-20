/**
 * 未知のコマンドの表示 (test/contract/routing.test.tsx)。`app/not-found.tsx` で上書きできる。
 *
 * **このファイルは Intent `run-commands-as-declared` の Evidence を分担する**。
 * 見ているのは「打ち間違えた人が案内を受け取る」という結末なので、
 * 普通のテストではなく `guides-when-the-command-is-missing` の証明として
 * 数える (ADR 48)。ファイルは動かさず、`report(..., { partial: true })` で
 * 分担を宣言する — 全 Behavior が揃ったかの判定は doc.ts の合流後。
 */
import { expect } from 'bun:test';

import { Line, List, run, Text } from 'decopin-cli';
import type { NotFoundProps, RouteTable } from 'decopin-cli';

import { describeBehavior, proves, report } from '../intent/evidence.bun.ts';
import { IMPLEMENTATION as RUNTIME } from '../intent/runtime/implementation.ts';

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
  hello: { cmd: loader(() => <Line>hello</Line>) },
  'user/list': { cmd: loader(() => <Line>alice</Line>) },
};

describeBehavior(RUNTIME, 'guides-when-the-command-is-missing', () => {
  proves('候補があれば提案し、stderr + exit 2', async () => {
    const result = await invoke(table, ['helo']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: helo');
    expect(result.stderr).toContain('Did you mean: hello');
  });

  proves('候補が無ければコマンド一覧を並べる', async () => {
    const result = await invoke(table, ['zzzzzz']);
    expect(result.stderr).toContain('Available commands: hello, user list');
  });

  proves('グループの下の未知のコマンドも拾う', async () => {
    const result = await invoke(table, ['user', 'nope']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Unknown command: user nope');
  });

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

  proves('props を受け取って表示を差し替える', async () => {
    const result = await invoke(table, ['helo'], loader(view));
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('cli: no such command "helo"\ntry: hello\n');
  });

  proves('候補が無い場合はコマンド名が空白区切りで渡る', async () => {
    const result = await invoke(table, ['zzzzzz'], loader(view));
    expect(result.stderr).toContain('- hello');
    expect(result.stderr).toContain('- user list');
  });

  proves('失敗したら組み込みの表示に戻る', async () => {
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

  proves(
    'コンポーネントを default export していなければ組み込みに戻る',
    async () => {
      const result = await invoke(table, ['helo'], loader(42));
      expect(result.stderr).toContain('Unknown command: helo');
    }
  );

  proves(
    '<Stdout> を使えば stdout にも出せる (終了コードは 2 のまま)',
    async () => {
      const result = await invoke(
        table,
        ['helo'],
        loader(() => <Line>quiet</Line>)
      );
      expect(result.code).toBe(2);
      expect(result.stderr).toBe('quiet\n');
    }
  );
});

// この Intent の証明は他のファイルと分担している。必ず末尾で 1 回
report(RUNTIME, { partial: true });
