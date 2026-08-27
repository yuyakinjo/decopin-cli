/**
 * Phase 5: middleware.tsx の適用順 (ADR 13)。
 * next は関数なので、呼ばないと中が走らない。
 */
import { describe, expect, test } from 'bun:test';

import { Argv, Line, Option, run, Stderr } from 'decopin-cli';
import type { MiddlewareProps, RouteLoaders, RouteTable } from 'decopin-cli';

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

function loader(value: unknown) {
  return async () => ({ default: value });
}

describe('middleware.tsx', () => {
  test('外側 = 上位ディレクトリの順に入れ子で走る', async () => {
    const trace: string[] = [];
    const spy =
      (label: string) =>
      async ({ next }: MiddlewareProps) => {
        trace.push(`${label}:before`);
        const output = await next();
        trace.push(`${label}:after`);
        return output;
      };
    const table: RouteTable = {
      x: {
        command: loader(() => {
          trace.push('command');
          return <Line>body</Line>;
        }),
        middlewares: [loader(spy('root')), loader(spy('inner'))],
      },
    };

    const result = await invoke(table, ['x']);
    expect(result.stdout).toBe('body\n');
    expect(trace).toEqual([
      'root:before',
      'inner:before',
      'command',
      'inner:after',
      'root:after',
    ]);
  });

  test('next を呼ばなければコマンドは実行されない', async () => {
    let called = false;
    const table: RouteTable = {
      x: {
        command: loader(() => {
          called = true;
          return <Line>body</Line>;
        }),
        middlewares: [loader(() => <Line>short circuit</Line>)],
      },
    };
    const result = await invoke(table, ['x']);
    expect(called).toBe(false);
    expect(result.stdout).toBe('short circuit\n');
  });

  test('検証済みの args / options を受け取る (ADR 11)', async () => {
    const seen: Record<string, unknown>[] = [];
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        argv: loader(() => (
          <Argv>
            <Option name="loud" type="boolean" default={false} />
          </Argv>
        )),
        middlewares: [
          loader(async ({ next, args, options }: MiddlewareProps) => {
            seen.push({ args, options });
            return next();
          }),
        ],
      },
    };
    await invoke(table, ['x', '--loud']);
    expect(seen).toEqual([{ args: {}, options: { loud: true } }]);
  });

  test('検証に失敗したら middleware は走らない (ADR 11 の代償)', async () => {
    let entered = false;
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        argv: loader(() => (
          <Argv>
            <Option name="loud" type="boolean" default={false} />
          </Argv>
        )),
        middlewares: [
          loader(async ({ next }: MiddlewareProps) => {
            entered = true;
            return next();
          }),
        ],
      },
    };
    const result = await invoke(table, ['x', '--nope']);
    expect(result.code).toBe(2);
    expect(entered).toBe(false);
  });

  test('出力に足すことができる (可能だが非推奨)', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        middlewares: [
          loader(async ({ next }: MiddlewareProps) => (
            <>
              {await next()}
              <Stderr>
                <Line>done</Line>
              </Stderr>
            </>
          )),
        ],
      },
    };
    const result = await invoke(table, ['x']);
    expect(result.stdout).toBe('body\n');
    expect(result.stderr).toBe('done\n');
  });

  test('middleware の throw は error.tsx に流れる', async () => {
    const failing: RouteLoaders = {
      command: loader(() => <Line>body</Line>),
      middlewares: [
        loader(() => {
          throw new Error('middleware failed');
        }),
      ],
      errors: [loader(() => <Line>handled</Line>)],
    };
    const result = await invoke({ x: failing }, ['x']);
    expect(result.code).toBe(1);
    expect(result.stderr).toBe('handled\n');
  });

  test('コマンドの throw を middleware で捕まえられる', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => {
          throw new Error('boom');
        }),
        middlewares: [
          loader(async ({ next }: MiddlewareProps) => {
            try {
              return await next();
            } catch {
              return <Line>recovered</Line>;
            }
          }),
        ],
      },
    };
    const result = await invoke(table, ['x']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('recovered\n');
  });

  test('default export が関数でなければ分かるエラーになる', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        middlewares: [loader('not a function')],
      },
    };
    const result = await invoke(table, ['x']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      'middleware.tsx must default-export a function'
    );
  });
});

describe('middleware と layout の関係', () => {
  test('layout は middleware が返した出力を包む', async () => {
    const table: RouteTable = {
      x: {
        command: loader(() => <Line>body</Line>),
        middlewares: [
          loader(async ({ next }: MiddlewareProps) => (
            <>
              <Line>mw</Line>
              {await next()}
            </>
          )),
        ],
        layouts: [
          loader(({ children }: { children: unknown }) => (
            <>
              <Line>layout</Line>
              {children as never}
            </>
          )),
        ],
      },
    };
    const result = await invoke(table, ['x']);
    expect(result.stdout).toBe('layout\nmw\nbody\n');
  });
});
