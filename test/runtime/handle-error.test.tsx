/**
 * Phase 4 の完了条件: エラー経路のフォールバック順が仕様どおり (test/contract/routing.test.tsx)。
 * 近い error.tsx → 親の error.tsx → global-error.tsx → 組み込み。
 */
import { describe, expect, test } from 'bun:test';

import {
  CliError,
  DeclarationError,
  errorTag,
  Exit,
  isCliError,
  isDeclarationError,
  isRenderError,
  Line,
  run,
  Stdout,
  Text,
} from 'decopin-cli';
import type { ErrorProps, RouteLoaders, RouteTable } from 'decopin-cli';
import { RenderError } from 'decopin-cli';

import { toCliError } from '../../src/features/inherited/error/runtime.tsx';

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
  globalError?: () => Promise<unknown>,
  env: Record<string, string | undefined> = {}
) {
  const stdout = recorder();
  const stderr = recorder();
  const code = await run(table, {
    argv,
    env: { NO_COLOR: '1', ...env },
    program: 'cli',
    globalError,
    targets: { stdout, stderr },
  });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

/** 投げるコマンドと、渡された error.tsx の並びを持つルート */
function failing(
  errors: Array<(props: ErrorProps) => unknown> = [],
  thrown: unknown = new Error('boom')
): RouteLoaders {
  return {
    cmd: async () => ({
      default: () => {
        throw thrown;
      },
    }),
    errors: errors.map((handler) => async () => ({ default: handler })),
  };
}

const asHandler = (label: string) => (props: ErrorProps) => (
  <Line>
    {label}: {props.error.message}
  </Line>
);

describe('フォールバック順', () => {
  test('自分のディレクトリの error.tsx が最優先', async () => {
    const result = await invoke(
      { x: failing([asHandler('own'), asHandler('parent')]) },
      ['x'],
      async () => ({ default: asHandler('global') })
    );
    expect(result.stderr).toBe('own: boom\n');
  });

  test('自分に無ければ親の error.tsx', async () => {
    const result = await invoke(
      { x: failing([asHandler('parent')]) },
      ['x'],
      async () => ({ default: asHandler('global') })
    );
    expect(result.stderr).toBe('parent: boom\n');
  });

  test('error.tsx が無ければ global-error.tsx', async () => {
    const result = await invoke({ x: failing() }, ['x'], async () => ({
      default: asHandler('global'),
    }));
    expect(result.stderr).toBe('global: boom\n');
  });

  test('どれも無ければ組み込みの表示', async () => {
    const result = await invoke({ x: failing() }, ['x']);
    expect(result.stderr).toContain('✖ boom');
  });

  test('error.tsx が自分で失敗したら次の候補に進む', async () => {
    const broken = () => {
      throw new Error('handler is broken');
    };
    const result = await invoke({ x: failing([broken]) }, ['x'], async () => ({
      default: asHandler('global'),
    }));
    expect(result.stderr).toBe('global: boom\n');
  });

  test('全部失敗したら組み込みが理由も添える', async () => {
    const broken = () => {
      throw new Error('handler is broken');
    };
    const result = await invoke({ x: failing([broken]) }, ['x']);
    expect(result.stderr).toContain('✖ boom');
    expect(result.stderr).toContain('An error handler itself failed');
    expect(result.stderr).toContain('handler is broken');
  });

  test('default export がコンポーネントでない error.tsx は飛ばす', async () => {
    const result = await invoke(
      {
        x: {
          cmd: async () => ({
            default: () => {
              throw new Error('boom');
            },
          }),
          errors: [async () => ({ default: 'not a component' })],
        },
      },
      ['x'],
      async () => ({ default: asHandler('global') })
    );
    expect(result.stderr).toBe('global: boom\n');
  });
});

describe('error.tsx の props と出力先', () => {
  test('既定の出力先は stderr', async () => {
    const result = await invoke({ x: failing([asHandler('own')]) }, ['x']);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('own: boom\n');
  });

  test('<Stdout> で stdout に出すこともできる', async () => {
    const handler = () => (
      <Stdout>
        <Line>on stdout</Line>
      </Stdout>
    );
    const result = await invoke({ x: failing([handler]) }, ['x']);
    expect(result.stdout).toBe('on stdout\n');
    expect(result.stderr).toBe('');
  });

  test('argv と cwd も渡る', async () => {
    const handler = (props: ErrorProps) => (
      <Line>
        {props.argv.join(',')}|{props.cwd}
      </Line>
    );
    const result = await invoke({ x: failing([handler]) }, ['x', 'a', 'b']);
    expect(result.stderr).toBe(`a,b|${process.cwd()}\n`);
  });

  test('async な error.tsx も待つ', async () => {
    const handler = async (props: ErrorProps) => {
      await Promise.resolve();
      return <Line>later: {props.error.message}</Line>;
    };
    const result = await invoke({ x: failing([handler]) }, ['x']);
    expect(result.stderr).toBe('later: boom\n');
  });

  test('kind で場合分けできる', async () => {
    const handler = (props: ErrorProps) => (
      <Line>
        <Text>{props.error.kind}</Text>
      </Line>
    );
    const table: RouteTable = {
      x: {
        cmd: async () => ({ default: () => <Line>ok</Line> }),
        argv: async () => ({
          default: () => null,
        }),
        errors: [async () => ({ default: handler })],
      },
    };
    // argv.tsx が <Argv> を返していないので宣言の誤り = runtime
    const result = await invoke(table, ['x']);
    expect(result.stderr).toBe('runtime\n');
  });
});

describe('終了コード', () => {
  test('検証エラーは 2', async () => {
    const result = await invoke(
      {
        x: failing(
          [],
          new CliError('bad', { kind: 'validation', exitCode: 2 })
        ),
      },
      ['x']
    );
    expect(result.code).toBe(2);
  });

  test('実行時エラーは 1', async () => {
    const result = await invoke({ x: failing() }, ['x']);
    expect(result.code).toBe(1);
  });

  test('error.tsx の <Exit> が既定を上書きする', async () => {
    const handler = (props: ErrorProps) => (
      <>
        <Line>{props.error.message}</Line>
        <Exit code={42} />
      </>
    );
    const result = await invoke({ x: failing([handler]) }, ['x']);
    expect(result.code).toBe(42);
  });

  test('CliError の exitCode を尊重する', async () => {
    const result = await invoke(
      { x: failing([], new CliError('nope', { exitCode: 7 })) },
      ['x']
    );
    expect(result.code).toBe(7);
  });
});

describe('エラーの見分けは印で行う (ADR 42)', () => {
  /**
   * 別実体の CliError を模す。node_modules に decopin-cli が 2 つ入ると
   * 起きる状態で、`instanceof` は false になるが印は残っている
   */
  function foreignCliError(message: string): unknown {
    return Object.assign(new Error(message), {
      [Symbol.for('decopin.CliError')]: true,
      kind: 'validation',
      exitCode: 2,
      issues: [message],
      hints: [],
    });
  }

  test('別実体でも isCliError() は当たる (instanceof は外れる)', () => {
    const foreign = foreignCliError('--name is required');
    expect(foreign instanceof CliError).toBe(false);
    expect(isCliError(foreign)).toBe(true);
  });

  test('自前の CliError はもちろん当たる', () => {
    expect(isCliError(new CliError('boom'))).toBe(true);
  });

  test('ただの Error や印の無いものは当たらない', () => {
    expect(isCliError(new Error('boom'))).toBe(false);
    expect(isCliError({ message: 'boom' })).toBe(false);
    expect(isCliError(undefined)).toBe(false);
  });

  test('印は 1 つのシンボルに種類の名前を載せる。errorTag() で読める', () => {
    expect(errorTag(new CliError('boom'))).toBe('CliError');
    expect(errorTag(new DeclarationError('boom'))).toBe('DeclarationError');
    expect(errorTag(new RenderError('boom'))).toBe('RenderError');
    expect(errorTag(new Error('boom'))).toBeUndefined();
    expect(errorTag('boom')).toBeUndefined();
  });

  test('新しい印だけを持つ別実体も、種類ごとの判定に当たる', () => {
    const tag = (name: string) =>
      Object.assign(new Error(name), { [Symbol.for('decopin.error')]: name });
    expect(isCliError(tag('CliError'))).toBe(true);
    expect(isDeclarationError(tag('DeclarationError'))).toBe(true);
    expect(isRenderError(tag('RenderError'))).toBe(true);
    // 種類は混ざらない
    expect(isCliError(tag('RenderError'))).toBe(false);
  });

  test('旧い印 (種類ごとのシンボル) は 2027-09-04 まで当たる', () => {
    const legacyDeclaration = Object.assign(new Error('bad argv.tsx'), {
      [Symbol.for('decopin.DeclarationError')]: true,
    });
    expect(isDeclarationError(legacyDeclaration)).toBe(true);
    expect(errorTag(legacyDeclaration)).toBe('DeclarationError');
    // 旧バージョンの受け手のために、新しいインスタンスにも旧い印を付けたまま
    expect(
      (new CliError('boom') as unknown as Record<symbol, unknown>)[
        Symbol.for('decopin.CliError')
      ]
    ).toBe(true);
  });

  test('DeclarationError / RenderError は cause を保ったまま CliError に包まれる', async () => {
    const result = await invoke(
      { x: failing([], new RenderError('<Exit code> requires an integer')) },
      ['x']
    );
    // 利用者のコードのバグは実行時の失敗 (exit 1)。使い方の誤り (exit 2) ではない
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('<Exit code> requires an integer');
  });

  test('別実体の CliError は kind と exitCode を保ったまま扱われる', async () => {
    const result = await invoke(
      { x: failing([], foreignCliError('--name is required')) },
      ['x']
    );
    // 包み直されていれば kind が runtime に落ちて exit 1 になる。
    // 印で見分けられていれば validation のまま exit 2
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('--name is required');
  });
});

describe('包み直してもスタックは潰れない', () => {
  // 名前付き関数から投げる。スタックにこの名前の枚が残っているかで見る
  function throwFromHere(make: (message: string) => Error): Error {
    try {
      throw make('boom');
    } catch (error) {
      return error as Error;
    }
  }

  /** 投げた場所の枚がスタックに残っているか */
  const origin = (error: Error) => error.stack ?? '';

  test('CliError は包み直さないので、スタックは投げた場所を指す', () => {
    const thrown = throwFromHere((m) => new CliError(m));
    const wrapped: Error = toCliError(thrown);
    expect(wrapped).toBe(thrown);
    expect(origin(wrapped)).toContain('throwFromHere');
  });

  test.each([
    ['RenderError', (m: string) => new RenderError(m)],
    ['DeclarationError', (m: string) => new DeclarationError(m)],
    ['Error', (m: string) => new Error(m)],
  ])('%s は cause に元の実体が入り、投げた場所が残る', (_name, make) => {
    const thrown = throwFromHere(make);
    const wrapped = toCliError(thrown);
    expect(wrapped).not.toBe(thrown);
    expect(wrapped.cause).toBe(thrown);
    expect(wrapped.message).toBe('boom');
    // 包んだ側のスタックは toCliError を指すが、元の場所は cause から辿れる
    expect(origin(thrown)).toContain('throwFromHere');
    expect(origin(wrapped)).not.toContain('throwFromHere');
  });

  test('別実体の CliError も素通しで、スタックはそのまま', () => {
    const foreign = throwFromHere((m) =>
      Object.assign(new Error(m), {
        [Symbol.for('decopin.error')]: 'CliError',
        kind: 'runtime',
        exitCode: 1,
        issues: [],
        hints: [],
      })
    );
    expect<Error>(toCliError(foreign)).toBe(foreign);
    expect(origin(foreign)).toContain('throwFromHere');
  });
});

describe('DECOPIN_DEBUG=1 で cause の連鎖とスタックが出る', () => {
  function raiseInData(): never {
    throw new Error('database is down');
  }
  const table = {
    x: failing([], undefined),
  } as Record<string, RouteLoaders>;
  table.x = {
    cmd: async () => ({
      default: () => raiseInData(),
    }),
  };

  test('既定では出ない', async () => {
    const result = await invoke(table, ['x']);
    expect(result.stderr).toContain('database is down');
    expect(result.stderr).not.toContain('Caused by');
    expect(result.stderr).not.toContain('raiseInData');
  });

  test('入っていれば、投げた場所が Caused by の下に残る', async () => {
    const result = await invoke(table, ['x'], undefined, {
      DECOPIN_DEBUG: '1',
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Caused by: Error: database is down');
    expect(result.stderr).toContain('raiseInData');
    // stdout は空のまま (失敗時に stdout へ書かない約束)
    expect(result.stdout).toBe('');
  });

  test('error.tsx があっても、その後ろに足される', async () => {
    const own = failing(
      [({ error }: ErrorProps) => <Line>own view: {error.message}</Line>],
      undefined
    );
    own.cmd = async () => ({ default: () => raiseInData() });
    const result = await invoke({ y: own }, ['y'], undefined, {
      DECOPIN_DEBUG: '1',
    });
    const view = result.stderr.indexOf('own view');
    const trace = result.stderr.indexOf('Caused by');
    expect(view).toBeGreaterThanOrEqual(0);
    expect(trace).toBeGreaterThan(view);
  });

  test.each(['0', 'false', ''])('%p は入っていない扱い', async (value) => {
    const result = await invoke(table, ['x'], undefined, {
      DECOPIN_DEBUG: value,
    });
    expect(result.stderr).not.toContain('Caused by');
  });
});
