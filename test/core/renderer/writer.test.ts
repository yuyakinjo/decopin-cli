import { afterEach, describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';

import {
  drainWrites,
  write,
  writeChunk,
} from '../../../src/core/renderer/writer.ts';
import { pipeline } from '../../fixtures/pipeline.ts';

function recorder() {
  const calls: string[] = [];
  return { calls, write: (chunk: string) => calls.push(chunk) };
}

describe('write', () => {
  test('fd ごとに 1 回だけ書き、stdout → stderr の順に出す', () => {
    const order: string[] = [];
    const stdout = { write: (c: string) => order.push(`out:${c}`) };
    const stderr = { write: (c: string) => order.push(`err:${c}`) };

    write(
      { stdout: 'a\nb\n', stderr: 'e\n', exitCode: undefined },
      {
        stdout,
        stderr,
      }
    );

    expect(order).toEqual(['out:a\nb\n', 'err:e\n']);
  });

  test('空の出力には write しない', () => {
    const stdout = recorder();
    const stderr = recorder();
    write({ stdout: '', stderr: '', exitCode: undefined }, { stdout, stderr });
    expect(stdout.calls).toEqual([]);
    expect(stderr.calls).toEqual([]);
  });
});

/**
 * 読み手が追いつかないパイプの代役。write は書き残しを抱えて false を返し、
 * 流れ切ったら 'drain' を出す (Bun の process.stdout と同じ約束)
 */
function clogged() {
  const pipe = Object.assign(new EventEmitter(), {
    writable: true,
    write: (_chunk: string) => false,
  });
  made.push(pipe);
  return pipe;
}

const made: EventEmitter[] = [];

// 書き残しの控えはプロセスで 1 つ。途中で落ちたテストが詰まった先を残すと、
// あとで drainWrites() を待つテストが巻き添えで止まるので、必ず流し切る
afterEach(() => {
  for (const pipe of made.splice(0)) pipe.emit('drain');
});

/** 少し待っても決着しないか */
async function stillWaiting(promise: Promise<void>): Promise<boolean> {
  return Promise.race([
    promise.then(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10)),
  ]);
}

describe('書き残しが流れ切るまで待つ。読み手が閉じたら待つのをやめる', () => {
  test('書き残しが無ければすぐ戻る', async () => {
    writeChunk(recorder(), 'a');
    writeChunk({ write: () => true }, 'a');
    expect(await stillWaiting(drainWrites())).toBe(false);
  });

  test("write が false を返した先は 'drain' まで待つ", async () => {
    const pipe = clogged();
    writeChunk(pipe, 'big');

    const done = drainWrites();
    expect(await stillWaiting(done)).toBe(true);

    pipe.emit('drain');
    await done;
    expect(pipe.listenerCount('drain')).toBe(0);
    expect(pipe.listenerCount('error')).toBe(0);
  });

  test('write() の書き出しも同じように待つ', async () => {
    const stdout = clogged();
    const stderr = clogged();
    write(
      { stdout: 'out', stderr: 'err', exitCode: undefined },
      { stdout, stderr }
    );

    const done = drainWrites();
    stdout.emit('drain');
    // stderr がまだ流れていない
    expect(await stillWaiting(done)).toBe(true);
    stderr.emit('drain');
    await done;
  });

  test('同じ先が何度詰まっても、待つ drain は 1 つ', async () => {
    const pipe = clogged();
    writeChunk(pipe, 'a');
    writeChunk(pipe, 'b');
    expect(pipe.listenerCount('drain')).toBe(1);

    pipe.emit('drain');
    await drainWrites();
  });

  test('待ち始める前に流れ切っていれば待たない', async () => {
    const pipe = clogged();
    writeChunk(pipe, 'big');
    pipe.emit('drain');
    expect(await stillWaiting(drainWrites())).toBe(false);
  });

  test("待っている間に読み手が閉じたら ('error')、そこで戻る", async () => {
    const pipe = clogged();
    writeChunk(pipe, 'big');

    const done = drainWrites();
    expect(await stillWaiting(done)).toBe(true);
    pipe.emit('error', new Error('EPIPE'));
    await done;

    expect(pipe.listenerCount('drain')).toBe(0);
    expect(pipe.listenerCount('error')).toBe(0);
    // 忘れているので、次は待たない
    expect(await stillWaiting(drainWrites())).toBe(false);
  });

  test("待つ前の 'error' は受けない。書けなくなった先は待たない", async () => {
    const pipe = clogged();
    writeChunk(pipe, 'big');
    // 動いている最中の書き込みエラーを握りつぶさない
    expect(pipe.listenerCount('error')).toBe(0);

    // 誰かがエラーを受けたあと。'drain' はもう来ない
    pipe.writable = false;
    expect(await stillWaiting(drainWrites())).toBe(false);
    expect(pipe.listenerCount('drain')).toBe(0);
  });

  test("'drain' を出せない差し替えは、false を返しても待たない", async () => {
    writeChunk({ write: () => false }, 'a');
    expect(await stillWaiting(drainWrites())).toBe(false);
  });
});

/**
 * ここまでは代役の stream で待ち方の理屈を見た。ここからは本物のパイプで、
 * 代役が写している Bun の約束そのものと、枠組みを通しても見え方が
 * 変わらないことを見る。当て木 (pipe-probe.ts) を別プロセスで動かす
 */
describe('本物のパイプでも、代役と同じ約束で動く', () => {
  const PROBE = join(import.meta.dir, '../../fixtures/pipe-probe.ts');
  /** pipe-probe.ts が 1 回に書く大きさ */
  const BIG = 200_000 + 1;

  /** 当て木の stdout を読み手につなぐ。終了コードは stderr の最後の行に残す */
  function probe(mode: string, reader: string) {
    return pipeline(`{ bun "$0" "$1"; echo "exit=$?" >&2; } | ${reader}`, [
      PROBE,
      mode,
    ]);
  }

  test("収まれば true、書き残せば false。最初の 'drain' は全部流れ切ったあとに来る", async () => {
    // 当て木は最初の 'drain' ですぐ exit する。流れ切る前に来ていれば切れる
    const result = await probe('drain', '(sleep 0.3; wc -c)');
    expect(result.stderr).toBe(
      `${JSON.stringify({ returned: [true, false, false, false] })}\nexit=0\n`
    );
    expect(Number(result.stdout)).toBe('small\n'.length + BIG * 3);
  }, 30_000);

  test('書いたあとも動いている間に読み手が閉じたら、生の write() と同じ見え方になる', async () => {
    // 終わり際の待ちより前の失敗は握りつぶさない。文面は Bun が決めるので、
    // 固定せず、枠組みを通さない場合と比べる
    const reader = 'head -c 100 >/dev/null';
    const raw = await probe('raw', reader);
    const chunk = await probe('chunk', reader);
    expect(raw.stderr).toMatch(/exit=\d+\n$/);
    expect(chunk).toEqual(raw);
  }, 30_000);

  test('書いたあとも動いている間に読み手が読み切れば、どちらも全量が届く', async () => {
    const reader = '(sleep 0.3; wc -c)';
    const raw = await probe('raw', reader);
    const chunk = await probe('chunk', reader);
    expect(Number(chunk.stdout)).toBe(BIG);
    expect(chunk.stderr).toBe('exit=0\n');
    expect(chunk).toEqual(raw);
  }, 30_000);
});
