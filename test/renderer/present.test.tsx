/**
 * ストリーミング・ドキュメント (`<Dynamic>`。ADR 22) の契約。
 *
 * - 静的な部分は到達した順に flush され、島の前後で順序が保たれる
 * - 島は stderr の領域。TTY ではフレームごとに消して描き直し、
 *   非 TTY では最終フレームだけを 1 回書く
 * - 島が無ければ従来どおり fd ごとに 1 回書き (ADR 1)
 */
import { describe, expect, test } from 'bun:test';

import {
  Box,
  Dynamic,
  Exit,
  frameRows,
  Line,
  present,
  run,
  Symbol as StatusSymbol,
} from 'decopin-cli';
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

describe('Promise のノード', () => {
  test('解決を待ってから描く', async () => {
    const io = channels();
    await present(Promise.resolve('later'), options(io));
    expect(textOf(io.log, 'out')).toBe('later\n');
  });
});

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

describe('ストリーミングの評価順', () => {
  test('島より後ろの async コンポーネントは、島が終わるまで評価しない', async () => {
    // source の中で解決される Promise を後続が待つ。全体を先に評価すると
    // デッドロックする (このテストはタイムアウトで落ちる)
    let opened = () => {};
    const gate = new Promise<void>((resolve) => {
      opened = resolve;
    });
    async function* src() {
      yield 'working';
      opened();
    }
    const After = async () => {
      await gate;
      return <Line>after</Line>;
    };
    const io = channels();
    await present(
      <>
        <Line>before</Line>
        <Dynamic source={src()}>{(v) => <Line>{v}</Line>}</Dynamic>
        <After />
      </>,
      options(io)
    );
    expect(io.log).toEqual(['out:before\n', 'err:working\n', 'out:after\n']);
  });
});

describe('repaint のライフサイクル', () => {
  const tty = { isTTY: { stdout: false, stderr: true } };
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  test('present() の解決後に古い repaint が書き込まない', async () => {
    // フレームの評価に時間がかかる async コンポーネント + 高頻度 interval
    const SlowFrame = async ({ value }: { value: string }) => {
      await sleep(15);
      return <Line>{value}</Line>;
    };
    async function* once() {
      yield 'only';
    }
    const io = channels();
    await present(
      <Dynamic source={once()} interval={1}>
        {(value) => <SlowFrame value={value} />}
      </Dynamic>,
      options(io, tty)
    );
    const written = io.log.length;
    await sleep(50);
    expect(io.log.length).toBe(written);
    expect(textOf(io.log, 'err').endsWith(SHOW)).toBe(true);
  });

  test('repaint の失敗は、source が待ち続けていても伝播する', async () => {
    let calls = 0;
    async function* pending() {
      yield 'ok';
      // 2 つ目の値は永久に来ない
      await new Promise(() => {});
    }
    const io = channels();
    await expect(
      present(
        <Dynamic source={pending()} interval={5}>
          {(value) => {
            calls += 1;
            if (calls > 1) throw new Error('frame broke');
            return <Line>{value}</Line>;
          }}
        </Dynamic>,
        options(io, tty)
      )
    ).rejects.toThrow('frame broke');
    expect(textOf(io.log, 'err').endsWith(SHOW)).toBe(true);
  });

  test('SIGWINCH が来ても明示した columns は変わらない', async () => {
    async function* wait() {
      yield 'x'.repeat(12);
      await sleep(30);
    }
    const io = channels();
    const timer = setTimeout(() => {
      (process as unknown as { emit(event: string): void }).emit('SIGWINCH');
    }, 10);
    await present(
      <Dynamic source={wait()}>{(value) => <Line>{value}</Line>}</Dynamic>,
      options(io, { ...tty, columns: 5 })
    );
    clearTimeout(timer);
    // リサイズの repaint も、明示した幅 5 での行数 (3 行) で消している
    expect(textOf(io.log, 'err')).toContain(`${ESC}[3A\r${ESC}[0J`);
    expect(textOf(io.log, 'err')).not.toContain(`${ESC}[1A`);
  });
});

describe('端末の高さへの切り詰め (ADR 40)', () => {
  const tty = { isTTY: { stdout: false, stderr: true } };
  const HEIGHT = 60;
  const tall = Array.from({ length: HEIGHT }, (_, index) => index);

  async function* twice() {
    yield 1;
    yield 2;
  }

  /** 60 行の論理行を持つフレーム。末尾が最新情報という進捗系の形 */
  const TallFrame = () => (
    <>
      {tall.map((index) => (
        <Line key={index}>row {index}</Line>
      ))}
    </>
  );

  /** 消去列 `ESC[nA` の n を出現順に */
  // oxlint-disable-next-line no-control-regex -- エスケープ列を拾うのが目的
  const CURSOR_UP = /\u001b\[(\d+)A/g;
  const eraseCounts = (text: string): number[] =>
    [...text.matchAll(CURSOR_UP)].map((match) => Number(match[1]));

  /** エスケープ列を落とした、最後に描いたフレームの行 */
  const lastFrameLines = (text: string): string[] => {
    const frames = text.split(`\r${ESC}[0J`);
    const last = frames[frames.length - 1] as string;
    return last
      .replace(SHOW, '')
      .split('\n')
      .filter((line) => line !== '');
  };

  test('端末より高いフレームは rows - 1 に収め、末尾を残して先頭を捨てる', async () => {
    const io = channels();
    await present(
      <Dynamic source={twice()}>{() => <TallFrame />}</Dynamic>,
      options(io, { ...tty, columns: 80, rows: 24 })
    );
    const err = textOf(io.log, 'err');
    const erases = eraseCounts(err);
    expect(erases).toHaveLength(1);
    expect(erases[0]).toBeLessThanOrEqual(23);

    const lines = lastFrameLines(err);
    expect(lines.length).toBeLessThanOrEqual(23);
    expect(lines[lines.length - 1]).toBe('row 59');
    expect(lines).not.toContain('row 0');
    const markers = lines.filter((line) => /more lines/.test(line));
    expect(markers).toHaveLength(1);
    expect(markers[0]).toBe(lines[0]);
  });

  test('折り返しと合成しても物理行の予算に収まる', async () => {
    const wide = ['a', 'b', 'c', 'd'].map((letter) => letter.repeat(25));
    async function* once() {
      yield 1;
      yield 2;
    }
    const io = channels();
    await present(
      <Dynamic source={once()}>
        {() => (
          <>
            {wide.map((text) => (
              <Line key={text}>{text}</Line>
            ))}
          </>
        )}
      </Dynamic>,
      options(io, { ...tty, columns: 10, rows: 5 })
    );
    const err = textOf(io.log, 'err');
    // 幅 25 は 10 桁で 3 物理行。予算 4 行には省略行 1 + 論理行 1 (3 行) しか入らない
    expect(eraseCounts(err)).toEqual([4]);
    const lines = lastFrameLines(err);
    expect(lines[lines.length - 1]).toBe('d'.repeat(25));
    expect(frameRows(`${lines.join('\n')}\n`, 10)).toBeLessThanOrEqual(4);
  });

  test('非 TTY では切り詰めない (最終出力は完全な形で残る)', async () => {
    const io = channels();
    await present(
      <Dynamic source={twice()}>{() => <TallFrame />}</Dynamic>,
      options(io, { rows: 5 })
    );
    const lines = textOf(io.log, 'err')
      .split('\n')
      .filter((l) => l !== '');
    expect(lines).toHaveLength(HEIGHT);
    expect(lines[0]).toBe('row 0');
    expect(lines[HEIGHT - 1]).toBe('row 59');
  });

  test('rows を明示しないと process.stderr.rows を読む', async () => {
    const stream = process.stderr as unknown as { rows?: number };
    const original = Object.getOwnPropertyDescriptor(process.stderr, 'rows');
    Object.defineProperty(process.stderr, 'rows', {
      value: 10,
      configurable: true,
      writable: true,
    });
    try {
      const io = channels();
      await present(
        <Dynamic source={twice()}>{() => <TallFrame />}</Dynamic>,
        options(io, { ...tty, columns: 80 })
      );
      const err = textOf(io.log, 'err');
      expect(eraseCounts(err)).toEqual([9]);
      expect(lastFrameLines(err)).toHaveLength(9);
    } finally {
      if (original === undefined) delete stream.rows;
      else Object.defineProperty(process.stderr, 'rows', original);
    }
  });
});

describe('フレームの内容の契約', () => {
  test('<Exit> はフレームの中に置けない', async () => {
    async function* once() {
      yield 'v';
    }
    const io = channels();
    await expect(
      present(
        <Dynamic source={once()}>
          {() => (
            <>
              <Line>done</Line>
              <Exit code={7} />
            </>
          )}
        </Dynamic>,
        options(io)
      )
    ).rejects.toThrow('cannot appear inside <Dynamic>');
  });

  test('interval は正の数だけを受け付ける', async () => {
    async function* once() {
      yield 'v';
    }
    const io = channels();
    await expect(
      present(
        <Dynamic source={once()} interval={0}>
          {(v) => <Line>{v}</Line>}
        </Dynamic>,
        options(io)
      )
    ).rejects.toThrow('positive');
  });

  test('Unicode の可否は静的チャンクと同じ locale 判定を使う', async () => {
    async function* once() {
      yield 'done';
    }
    const io = channels();
    await present(
      <>
        <Line>
          <StatusSymbol kind="success" /> static
        </Line>
        <Dynamic source={once()}>
          {(v) => (
            <Line>
              <StatusSymbol kind="success" /> {v}
            </Line>
          )}
        </Dynamic>
      </>,
      { ...options(io), env: { NO_COLOR: '1', LANG: 'C' } }
    );
    // LANG=C では静的も島も ASCII (`+`) に落ちる
    expect(textOf(io.log, 'out')).toContain('+ static');
    expect(textOf(io.log, 'err')).toContain('+ done');
    expect(io.log.join('')).not.toContain('✔');
  });

  test('国旗の絵文字は 2 桁として行数を数える', () => {
    // regional indicator の組を 1 桁と数えると、消す行数が足りず上段が残る
    expect(frameRows('🇯🇵🇯🇵\n', 2)).toBe(2);
  });
});

describe('シグナルでの後始末', () => {
  test('SIGTERM で殺されてもカーソルを返し、慣習コード 143 で終わる', async () => {
    const fixture = new URL('../fixtures/dynamic-signal.tsx', import.meta.url)
      .pathname;
    const proc = Bun.spawn(['bun', fixture], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // 島が描き始める (= シグナルハンドラが登録された) のを待ってから送る
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    let stderr = '';
    while (!stderr.includes('running')) {
      const { value, done } = await reader.read();
      if (done) break;
      stderr += decoder.decode(value, { stream: true });
    }
    proc.kill('SIGTERM');
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      stderr += decoder.decode(value, { stream: true });
    }

    const code = await proc.exited;
    expect(code).toBe(143);
    expect(stderr).toContain(HIDE);
    expect(stderr.endsWith(SHOW)).toBe(true);
  }, 10_000);
});

describe('run() を通した配線', () => {
  test('cmd.tsx が返した島も同じ契約で動く', async () => {
    const table: RouteTable = {
      deploy: {
        cmd: async () => ({
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

  test('targets を差し替えたら、isTTY を明示しない限り非 TTY として扱う', async () => {
    const table: RouteTable = {
      go: {
        cmd: async () => ({
          default: () => (
            <Dynamic source={three()}>{(step) => <Line>{step}</Line>}</Dynamic>
          ),
        }),
      },
    };
    const io = channels();
    await run(table, {
      argv: ['go'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout: io.stdout, stderr: io.stderr },
    });
    // 実端末の isTTY を継承しない (キャプチャ先にエスケープ列を混ぜない)
    expect(textOf(io.log, 'err')).toBe('three\n');
  });

  test('isTTY を明示すれば run() からも領域描画になる', async () => {
    const table: RouteTable = {
      go: {
        cmd: async () => ({
          default: () => (
            <Dynamic source={three()}>{(step) => <Line>{step}</Line>}</Dynamic>
          ),
        }),
      },
    };
    const io = channels();
    await run(table, {
      argv: ['go'],
      env: { NO_COLOR: '1' },
      program: 'cli',
      targets: { stdout: io.stdout, stderr: io.stderr },
      isTTY: { stdout: false, stderr: true },
    });
    expect(textOf(io.log, 'err')).toBe(
      `${HIDE}one\n${ERASE_1}two\n${ERASE_1}three\n${SHOW}`
    );
  });
});
