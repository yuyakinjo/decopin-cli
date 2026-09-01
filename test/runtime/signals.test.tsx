/**
 * `notFound()` / `help()` と「よくある形」の詰め合わせ (ADR 30)。
 *
 * 型の一覧を宣言させる代わりに、CLI で毎回書く形を用意する方針。
 * ここはその形が約束どおり動くことを固定する
 */
import { describe, expect, test } from 'bun:test';

import {
  Arg,
  Argv,
  closest,
  DidYouMean,
  help,
  Line,
  notFound,
  render,
  run,
} from 'decopin-cli';
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

const loader = (value: unknown) => async () => ({ default: value });
const USERS = ['alice', 'bob', 'carol'];

/** 近い順に試される not-found.tsx を見分けるための目印 */
const nearView = loader(({ what }: NotFoundProps) => <Line>NEAR {what}</Line>);
const farView = loader(({ what }: NotFoundProps) => <Line>FAR {what}</Line>);

const table: RouteTable = {
  show: {
    command: loader(() => <Line>never</Line>),
    data: loader(({ argv }: { argv: readonly string[] }) => {
      const name = argv[0] ?? '';
      if (!USERS.includes(name)) {
        notFound({ what: 'user', requested: name, available: USERS });
      }
      return { name };
    }),
  },
  bare: {
    command: loader(() => {
      notFound();
    }),
  },
  coded: {
    command: loader(() => {
      notFound({ what: 'branch', requested: 'main', exitCode: 4 });
    }),
  },
  'nested/deep': {
    command: loader(() => {
      notFound({ what: 'thing' });
    }),
    notFounds: [nearView, farView],
  },
};

describe('notFound()', () => {
  test('組み込みの表示に落ち、exit 1 (失敗ではなく「無かった」)', async () => {
    const result = await invoke(table, ['show', 'zzzz']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('No such user: zzzz');
  });

  test('available から「もしかして」が自動で付く', async () => {
    const result = await invoke(table, ['show', 'alcie']);
    expect(result.stderr).toContain('Did you mean: alice');
  });

  test('近い候補が無ければ一覧を出す', async () => {
    const result = await invoke(table, ['show', 'zzzz']);
    expect(result.stderr).toContain('alice, bob, carol');
  });

  test('引数なしでも呼べる', async () => {
    const result = await invoke(table, ['bare']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('No such resource');
  });

  test('終了コードを指定できる', async () => {
    const result = await invoke(table, ['coded']);
    expect(result.code).toBe(4);
  });

  test('一番近い not-found.tsx が使われる', async () => {
    const result = await invoke(table, ['nested', 'deep']);
    expect(result.stderr).toContain('NEAR thing');
    expect(result.stderr).not.toContain('FAR');
  });

  test('--json なら構造化して stderr に出る', async () => {
    const result = await invoke(table, ['show', 'alcie', '--json']);
    expect(result.stdout).toBe('');
    const payload = JSON.parse(result.stderr) as {
      error: { code: string; what: string; suggestion?: string };
    };
    expect(payload.error).toMatchObject({
      code: 'not-found',
      what: 'user',
      suggestion: 'alice',
    });
  });
});

describe('closest()', () => {
  test('打ち間違いに一番近いものを返す', () => {
    expect(closest('alcie', USERS)).toBe('alice');
  });

  test('遠すぎるものは提案しない (混乱させるため)', () => {
    expect(closest('zzzzzz', USERS)).toBeUndefined();
  });

  test('候補が空なら undefined', () => {
    expect(closest('alice', [])).toBeUndefined();
  });
});

describe('<DidYouMean>', () => {
  const plain = { env: { NO_COLOR: '1' }, columns: 60 };

  test('候補があれば 1 行で出す', async () => {
    const result = await render(
      <DidYouMean requested="alcie" from={USERS} />,
      plain
    );
    expect(result.stdout).toBe('Did you mean: alice?\n');
  });

  test('候補が無ければ一覧に落ちる', async () => {
    const result = await render(
      <DidYouMean requested="zzzzzz" from={USERS} />,
      plain
    );
    expect(result.stdout).toBe('Available: alice, bob, carol\n');
  });

  test('見出しを差し替えられる', async () => {
    const result = await render(
      <DidYouMean requested="zzzzzz" from={USERS} label="known users" />,
      plain
    );
    expect(result.stdout).toContain('known users: alice');
  });

  test('一覧を出さない指定ができる', async () => {
    const result = await render(
      <DidYouMean requested="zzzzzz" from={USERS} showAvailable={false} />,
      plain
    );
    expect(result.stdout).toBe('');
  });
});

describe('help()', () => {
  const usage: RouteTable = {
    deploy: {
      command: loader(({ args }: { args: { target?: string } }) => {
        if (args.target === undefined) {
          help({ message: 'give a target' });
        }
        return <Line>ok</Line>;
      }),
      argv: loader(() => (
        <Argv description="Deploy something.">
          <Arg name="target" type="string" description="what to deploy" />
        </Argv>
      )),
    },
    quiet: {
      command: loader(() => {
        help();
      }),
    },
    zero: {
      command: loader(() => {
        help({ exitCode: 0 });
      }),
    },
    overridden: {
      command: loader(() => {
        help();
      }),
    },
  };

  test('使い方を stderr に出して exit 2 (求められて出すのではない)', async () => {
    const result = await invoke(usage, ['deploy']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage: cli deploy');
    expect(result.stderr).toContain('what to deploy');
  });

  test('理由の一行を先に出せる', async () => {
    const result = await invoke(usage, ['deploy']);
    expect(result.stderr).toContain('give a target');
  });

  test('message は省略できる', async () => {
    const result = await invoke(usage, ['quiet']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Usage: cli quiet');
  });

  test('終了コードを指定できる', async () => {
    const result = await invoke(usage, ['zero']);
    expect(result.code).toBe(0);
  });

  test('help.tsx を置いていればそちらが使われる', async () => {
    const result = await run(usage, {
      argv: ['overridden'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout: recorder(), stderr: recorder() },
      helps: { overridden: loader(() => <Line>CUSTOM USAGE</Line>) },
    });
    expect(result).toBe(2);
  });

  test('--help は今までどおり stdout + exit 0 (help() と混ざらない)', async () => {
    const result = await invoke(usage, ['deploy', '--help']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: cli deploy');
  });
});
