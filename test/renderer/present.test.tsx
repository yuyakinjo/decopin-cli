/**
 * ストリーミング・ドキュメント (`<Dynamic>`。ADR 22) の契約。
 *
 * - 静的な部分は到達した順に flush され、島の前後で順序が保たれる
 * - 島は stderr の領域。TTY ではフレームごとに消して描き直し、
 *   非 TTY では最終フレームだけを 1 回書く
 * - 島が無ければ従来どおり fd ごとに 1 回書き (ADR 1)
 */
import { describe, expect, test } from 'bun:test';

import { Box, Dynamic, Exit, Line, present, run } from 'decopin-cli';
import type { PresentOptions, RouteTable } from 'decopin-cli';

const ESC = '\u001b';
const HIDE = `${ESC}[?25l`;
const SHOW = `${ESC}[?25h`;
/** 1 行ぶんの領域を消してカーソルを戻す列 */
const ERASE_1 = `${ESC}[1A\r${ESC}[0J`;

/** fd をまたいだ書き込み順を 1 本のログで記録する */
function channels() {
  const log: string[] = [];
  const target = (fd: 'out' | 'err') => ({
    write: (chunk: string) => log.push(`${fd}:${chunk}`),
  });
  return { log, stdout: target('out'), stderr: target('err') };
}

function textOf(log: string[], fd: 'out' | 'err'): string {
  return log
    .filter((entry) => entry.startsWith(`${fd}:`))
    .map((entry) => entry.slice(4))
    .join('');
}

async function* three() {
  yield 'one';
  yield 'two';
  yield 'three';
}

function options(
  io: ReturnType<typeof channels>,
  extra: Partial<PresentOptions> = {}
): PresentOptions {
  return {
    env: { NO_COLOR: '1' },
    targets: { stdout: io.stdout, stderr: io.stderr },
    isTTY: { stdout: false, stderr: false },
    columns: 40,
    ...extra,
  };
}

describe('非 TTY (パイプ / CI)', () => {
  test('静的 → 島 → 静的 の順に flush され、島は最終フレームだけ', async () => {
    const io = channels();
    await present(
      <>
        <Line>before</Line>
        <Dynamic source={three()}>{(step) => <Line>step {step}</Line>}</Dynamic>
        <Line>after</Line>
      </>,
      options(io)
    );
    expect(io.log).toEqual(['out:before\n', 'err:step three\n', 'out:after\n']);
  });

  test('source が空なら島は何も書かない', async () => {
    async function* empty() {}
    const io = channels();
    await present(
      <Dynamic source={empty()}>{() => <Line>never</Line>}</Dynamic>,
      options(io)
    );
    expect(io.log).toEqual([]);
  });

  test('島が無ければ fd ごとに 1 回書き (従来どおり)', async () => {
    const io = channels();
    await present(<Line>hi</Line>, options(io));
    expect(io.log).toEqual(['out:hi\n']);
  });

  test('島の後の <Exit> の終了コードを返す', async () => {
    const io = channels();
    const code = await present(
      <>
        <Dynamic source={three()}>{(step) => <Line>{step}</Line>}</Dynamic>
        <Exit code={3} />
      </>,
      options(io)
    );
    expect(code).toBe(3);
  });
});

describe('TTY (領域の描き換え)', () => {
  const tty = { isTTY: { stdout: false, stderr: true } };

  test('フレームごとに前の領域を消して描き直し、最後のフレームが残る', async () => {
    const io = channels();
    await present(
      <Dynamic source={three()}>{(step) => <Line>step {step}</Line>}</Dynamic>,
      options(io, tty)
    );
    expect(textOf(io.log, 'err')).toBe(
      `${HIDE}step one\n${ERASE_1}step two\n${ERASE_1}step three\n${SHOW}`
    );
  });

  test('折り返す行は複数行として消す (表示幅で数える)', async () => {
    async function* twice() {
      yield 'x'.repeat(12);
      yield 'done';
    }
    const io = channels();
    await present(
      <Dynamic source={twice()}>{(value) => <Line>{value}</Line>}</Dynamic>,
      options(io, { ...tty, columns: 5 })
    );
    // 12 桁は 5 桁の端末で 3 行に折り返す
    expect(textOf(io.log, 'err')).toContain(`${ESC}[3A\r${ESC}[0J`);
  });

  test('source が途中で投げたら、描いた分を残してカーソルを返し、エラーは伝播する', async () => {
    async function* boom() {
      yield 'one';
      throw new Error('exploded');
    }
    const io = channels();
    await expect(
      present(
        <Dynamic source={boom()}>{(step) => <Line>step {step}</Line>}</Dynamic>,
        options(io, tty)
      )
    ).rejects.toThrow('exploded');
    const err = textOf(io.log, 'err');
    expect(err).toContain('step one');
    expect(err.endsWith(SHOW)).toBe(true);
  });

  test('interval を指定すると、新しい値が無くても描き直す', async () => {
    async function* slow() {
      yield 'wait';
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    const io = channels();
    await present(
      <Dynamic source={slow()} interval={10}>
        {(value) => <Line>{value}</Line>}
      </Dynamic>,
      options(io, tty)
    );
    const paints = textOf(io.log, 'err').split('wait').length - 1;
    expect(paints).toBeGreaterThanOrEqual(2);
  });
});

describe('置ける場所の制約', () => {
  test('<Line> の中には置けない', async () => {
    const io = channels();
    await expect(
      present(
        <Line>
          <Dynamic source={three()}>{(step) => step}</Dynamic>
        </Line>,
        options(io)
      )
    ).rejects.toThrow('top-level block');
  });

  test('<Box> の中には置けない', async () => {
    const io = channels();
    await expect(
      present(
        <Box>
          <Dynamic source={three()}>{(step) => <Line>{step}</Line>}</Dynamic>
        </Box>,
        options(io)
      )
    ).rejects.toThrow('top-level block');
  });

  test('source が AsyncIterable でなければ誤りとして落ちる', async () => {
    const io = channels();
    await expect(
      present(
        // @ts-expect-error 誤用をわざと書く
        <Dynamic source={[1, 2]}>{(v: number) => <Line>{v}</Line>}</Dynamic>,
        options(io)
      )
    ).rejects.toThrow('AsyncIterable');
  });
});

describe('run() を通した配線', () => {
  test('command.tsx が返した島も同じ契約で動く', async () => {
    const table: RouteTable = {
      deploy: {
        command: async () => ({
          default: () => (
            <>
              <Line>deploying</Line>
              <Dynamic source={three()}>
                {(step) => <Line>at {step}</Line>}
              </Dynamic>
              <Line>done</Line>
            </>
          ),
        }),
      },
    };
    const io = channels();
    const code = await run(table, {
      argv: ['deploy'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout: io.stdout, stderr: io.stderr },
    });
    expect(code).toBe(0);
    expect(io.log).toEqual(['out:deploying\n', 'err:at three\n', 'out:done\n']);
  });
});
