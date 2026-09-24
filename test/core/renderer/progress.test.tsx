/**
 * `<Spinner>` と `<ProgressBar>` の契約 (ADR 23)。
 *
 * どちらも行の中に置ける純粋な表示。Spinner のコマは時刻ではなく
 * 描き直しの回数 (tick) で決まるので、出力は入力だけで決まる。
 */
import { describe, expect, test } from 'bun:test';

import {
  Dynamic,
  Line,
  present,
  ProgressBar,
  render,
  Spinner,
  Text,
} from 'decopin-cli';
import type { PresentOptions } from 'decopin-cli';

const PLAIN = { env: { NO_COLOR: '1' }, columns: 40 };
const ESC = String.fromCharCode(27);

function channels() {
  const log: string[] = [];
  const target = () => ({ write: (chunk: string) => log.push(chunk) });
  return { log, stdout: target(), stderr: target() };
}

function options(io: ReturnType<typeof channels>): PresentOptions {
  return {
    ...PLAIN,
    targets: { stdout: io.stdout, stderr: io.stderr },
    isTTY: { stdout: false, stderr: true },
  };
}

describe('<Spinner>', () => {
  test('静的な出力では最初のコマで止まる', async () => {
    const result = await render(
      <Line>
        <Spinner /> working
      </Line>,
      PLAIN
    );
    expect(result.stdout).toBe('⠋ working\n');
  });

  test('tick が同じなら出力も同じ (時刻を読まない)', async () => {
    const once = await render(
      <Line>
        <Spinner />
      </Line>,
      { ...PLAIN, tick: 3 }
    );
    const twice = await render(
      <Line>
        <Spinner />
      </Line>,
      { ...PLAIN, tick: 3 }
    );
    expect(once.stdout).toBe(twice.stdout);
    expect(once.stdout).toBe('⠸\n');
  });

  test('コマは一周して戻る', async () => {
    const first = await render(
      <Line>
        <Spinner />
      </Line>,
      { ...PLAIN, tick: 0 }
    );
    const round = await render(
      <Line>
        <Spinner />
      </Line>,
      { ...PLAIN, tick: 10 }
    );
    expect(round.stdout).toBe(first.stdout);
  });

  test('UTF-8 でない端末では ASCII に落ちる', async () => {
    const result = await render(
      <Line>
        <Spinner />
      </Line>,
      { ...PLAIN, env: { NO_COLOR: '1', LANG: 'C' } }
    );
    expect(result.stdout).toBe('|\n');
  });

  test('<Dynamic> の描き直しごとに次のコマへ進む', async () => {
    async function* three() {
      yield 'a';
      yield 'b';
      yield 'c';
    }
    const io = channels();
    await present(
      <Dynamic source={three()}>
        {() => (
          <Line>
            <Spinner />
          </Line>
        )}
      </Dynamic>,
      options(io)
    );
    const frames = io.log.join('');
    // 3 回描き直したので、コマも 3 つ順に出ている
    expect(frames).toContain('⠋');
    expect(frames).toContain('⠙');
    expect(frames).toContain('⠹');
  });

  test('外側の装飾を引き継ぐ', async () => {
    const result = await render(
      <Line>
        <Text color="cyan">
          <Spinner />
        </Text>
      </Line>,
      { ...PLAIN, color: { stdout: 4, stderr: 4 }, env: {} }
    );
    expect(result.stdout).toContain(`${ESC}[36m`);
  });
});

describe('<ProgressBar>', () => {
  const bar = async (props: { value: number; max?: number; width?: number }) =>
    (
      await render(
        <Line>
          <ProgressBar {...props} />
        </Line>,
        PLAIN
      )
    ).stdout.trimEnd();

  test('0 は空、満了だけが全部埋まる', async () => {
    expect(await bar({ value: 0, width: 4 })).toBe('░░░░');
    expect(await bar({ value: 100, width: 4 })).toBe('████');
  });

  test('途中は端に張り付かない (1 以上、width 未満)', async () => {
    // 1% でも「始まっている」ことが見え、99% でも「終わっていない」ことが見える
    expect(await bar({ value: 1, width: 4 })).toBe('█░░░');
    expect(await bar({ value: 99, width: 4 })).toBe('███░');
  });

  test('max を変えると割合が変わる', async () => {
    expect(await bar({ value: 1, max: 2, width: 4 })).toBe('██░░');
  });

  test('範囲外の値は端で止める', async () => {
    expect(await bar({ value: -5, width: 4 })).toBe('░░░░');
    expect(await bar({ value: 500, width: 4 })).toBe('████');
  });

  test('既定の幅は 20 桁', async () => {
    expect(await bar({ value: 50 })).toHaveLength(20);
  });

  test('UTF-8 でない端末では ASCII に落ちる', async () => {
    const result = await render(
      <Line>
        <ProgressBar value={50} width={4} />
      </Line>,
      { ...PLAIN, env: { NO_COLOR: '1', LANG: 'C' } }
    );
    expect(result.stdout).toBe('##--\n');
  });

  test('行の中で他の要素と並べられる', async () => {
    const result = await render(
      <Line>
        [<ProgressBar value={50} width={4} />] 50%
      </Line>,
      PLAIN
    );
    expect(result.stdout).toBe('[██░░] 50%\n');
  });

  test('誤った props は誤りとして落ちる', async () => {
    await expect(
      render(
        <Line>
          <ProgressBar value={Number.NaN} />
        </Line>,
        PLAIN
      )
    ).rejects.toThrow('finite');
    await expect(
      render(
        <Line>
          <ProgressBar value={1} max={0} />
        </Line>,
        PLAIN
      )
    ).rejects.toThrow('positive');
    await expect(
      render(
        <Line>
          <ProgressBar value={1} width={0} />
        </Line>,
        PLAIN
      )
    ).rejects.toThrow('positive integer');
  });
});
