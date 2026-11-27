/**
 * (4) 書き出し (ADR 1)。
 * fd ごとに 1 回だけ write する。分割して書くと、パイプ越しに
 * stdout と stderr が混ざったときに行が割れる事故が起きるため。
 *
 * 書き残しも見張る (ADR 54)。パイプ宛ての書き込みは、読み手が追いつかないと
 * 残りをプロセスの中に抱えたまま戻る。そこで `process.exit()` すると残りは
 * 捨てられるので、枠組みの書き込みはすべて `writeChunk()` を通し、終わる前に
 * `drainWrites()` で流れ切るのを待つ。
 */
import type { RenderResult } from './render.ts';

/** 書き出し先。テストから差し替えられるよう最小の形にしている */
export interface WritableLike {
  write(chunk: string): unknown;
}

/** stdout / stderr の書き出し先 */
export interface WriteTargets {
  stdout?: WritableLike;
  stderr?: WritableLike;
}

/** 流れ切ったことを知らせられる書き出し先 (Node の Writable の一部) */
interface Drainable extends WritableLike {
  once(event: 'drain' | 'error', listener: () => void): unknown;
  off(event: 'drain' | 'error', listener: () => void): unknown;
  /** 書き込みに失敗した stream は false になる */
  readonly writable?: boolean;
}

/** 書き残しを抱えている書き出し先 */
interface Stalled {
  /** 流れ切ったら解ける */
  drained: Promise<void>;
  /** 待つのをやめる。もう `'drain'` が来ないと分かったときに呼ぶ */
  forget(): void;
}

const stalled = new Map<Drainable, Stalled>();

function isDrainable(target: WritableLike): target is Drainable {
  return (
    typeof (target as Partial<Drainable>).once === 'function' &&
    typeof (target as Partial<Drainable>).off === 'function'
  );
}

/**
 * 1 回書く。書き残しが出たら覚えておく。
 *
 * 合図は `write()` が返す false だけ。Bun の `process.stdout` は
 * `writableLength` が常に 0 で、あとから書き残しの有無を聞く手段が無い。
 * `'drain'` は書き残しがすべて流れたときに 1 回だけ来るので、stream ごとに
 * 1 つ待てば足りる。あとから待ち始めると取り逃すため、その場で掛ける
 */
export function writeChunk(target: WritableLike, chunk: string): void {
  if (target.write(chunk) !== false) return;
  if (stalled.has(target as Drainable) || !isDrainable(target)) return;

  const { promise: drained, resolve } = Promise.withResolvers<void>();
  const onDrain = (): void => {
    stalled.delete(target);
    resolve();
  };
  target.once('drain', onDrain);
  stalled.set(target, {
    drained,
    forget: () => {
      target.off('drain', onDrain);
      stalled.delete(target);
    },
  });
}

/**
 * `writeChunk()` の書き残しが流れ切るのを待つ。`process.exit()` の前に呼ぶ。
 *
 * 読み手が先に閉じた (EPIPE) ら、そこで待つのをやめる。`'error'` を受けるのは
 * 待っている間だけにしている。ここより前の失敗まで受けると、動いている最中の
 * 書き込みエラーを握りつぶすことになるため。
 * 読み手が読まず閉じもしなければ待ち続ける (`cat` と同じ)
 */
export async function drainWrites(): Promise<void> {
  if (stalled.size === 0) return;
  await Promise.all(
    [...stalled].map(([target, { drained, forget }]) => {
      if (target.writable === false) {
        forget();
        return undefined;
      }
      return new Promise<void>((resolve) => {
        const onError = (): void => {
          forget();
          resolve();
        };
        target.once('error', onError);
        void drained.then(() => {
          target.off('error', onError);
          resolve();
        });
      });
    })
  );
}

/** 書き出し順は stdout → stderr に固定する (ADR 1) */
export function write(result: RenderResult, targets: WriteTargets = {}): void {
  const out = targets.stdout ?? process.stdout;
  const err = targets.stderr ?? process.stderr;

  if (result.stdout !== '') writeChunk(out, result.stdout);
  if (result.stderr !== '') writeChunk(err, result.stderr);
}
