/**
 * env.tsx / version.tsx のライフサイクル (test/contract/routing.test.tsx の 2, 3)。
 */
import { describe, expect, test } from 'bun:test';

import { Env, Line, run, Type, Var, Version } from 'decopin-cli';
import type { RouteTable, RunOptions } from 'decopin-cli';

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
  extra: RunOptions = {}
) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    program: 'cli',
    targets: { stdout, stderr },
    ...extra,
    env: { NO_COLOR: '1', ...extra.env },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

function loader(value: unknown) {
  return async () => ({ default: value });
}

const showEnv = ({ env }: { env: Record<string, unknown> }) => (
  <Line>{JSON.stringify(env)}</Line>
);

const table: RouteTable = { x: { cmd: loader(showEnv) } };

const envFile = loader(() => (
  <Env>
    <Var name="TOKEN" type="string" required />
    <Var name="LEVEL" default="info">
      <Type.Enum values={['debug', 'info']} />
    </Var>
  </Env>
));

describe('env.tsx', () => {
  test('検証済みの環境変数がコマンドに渡る', async () => {
    const result = await invoke(table, ['x'], {
      envFile,
      env: { TOKEN: 'secret' },
    });
    expect(result.stdout).toBe('{"TOKEN":"secret","LEVEL":"info"}\n');
    expect(result.code).toBe(0);
  });

  test('足りなければ exit 2 で、どれが足りないか伝える', async () => {
    const result = await invoke(table, ['x'], { envFile, env: {} });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'Missing required environment variable: TOKEN'
    );
  });

  test('検証に落ちた値は stderr にも --json にも載らない', async () => {
    // 環境変数は秘密でありうる。言うのは変数名と、満たさなかった宣言だけ
    const secret = 'synthetic-secret-9F3K';
    const tokenFile = loader(() => (
      <Env>
        <Var name="APP_TOKEN" required>
          <Type.String pattern="^expected-prefix-" />
        </Var>
        <Var name="RETRIES" default={3}>
          <Type.Number />
        </Var>
      </Env>
    ));
    const withData: RouteTable = {
      x: { cmd: loader(showEnv), data: loader(() => ({ ok: true })) },
    };
    for (const argv of [['x'], ['x', '--json']]) {
      const result = await invoke(withData, argv, {
        envFile: tokenFile,
        env: { APP_TOKEN: secret, RETRIES: `${secret}-2` },
      });
      expect(result.code).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(
        'APP_TOKEN: Invalid format: Expected /^expected-prefix-/'
      );
      expect(result.stderr).toContain('RETRIES: expected a number');
      expect(result.stderr).not.toContain(secret);
    }
  });

  test('env.tsx が無ければ空のまま何も検証しない', async () => {
    const result = await invoke(table, ['x'], { env: { TOKEN: 'x' } });
    expect(result.stdout).toBe('{}\n');
  });

  test('env が足りなくても --help は出る', async () => {
    const result = await invoke(table, ['x', '--help'], {
      envFile,
      env: {},
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Usage: cli x');
  });

  test('middleware も検証済みの env を受け取る', async () => {
    const seen: unknown[] = [];
    const withMiddleware: RouteTable = {
      x: {
        cmd: loader(showEnv),
        middlewares: [
          loader(
            async (props: {
              env: Record<string, unknown>;
              next: () => Promise<unknown>;
            }) => {
              seen.push(props.env);
              return props.next();
            }
          ),
        ],
      },
    };
    await invoke(withMiddleware, ['x'], {
      envFile,
      env: { TOKEN: 't', LEVEL: 'debug' },
    });
    expect(seen).toEqual([{ TOKEN: 't', LEVEL: 'debug' }]);
  });
});

describe('--version', () => {
  const versionFile = loader(() => <Version name="mycli" version="1.2.3" />);

  test('version.tsx の内容を出して exit 0', async () => {
    const result = await invoke(table, ['--version'], { versionFile });
    expect(result.stdout).toBe('mycli 1.2.3\n');
    expect(result.code).toBe(0);
  });

  test('コマンドを指定していても --version が勝つ', async () => {
    const result = await invoke(table, ['x', '--version'], { versionFile });
    expect(result.stdout).toBe('mycli 1.2.3\n');
  });

  test('name が無ければバージョンだけ', async () => {
    const result = await invoke(table, ['--version'], {
      versionFile: loader(() => <Version version="9.9.9" />),
    });
    expect(result.stdout).toBe('9.9.9\n');
  });

  test('version.tsx が無ければ exit 2 で置き場所を伝える', async () => {
    const result = await invoke(table, ['--version']);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Add app/version.tsx');
  });

  test('env が足りなくても --version は出る', async () => {
    const result = await invoke(table, ['--version'], {
      versionFile,
      envFile,
      env: {},
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('mycli 1.2.3\n');
  });
});
