import { describe, expect, test } from 'bun:test';

import { Br, Exit, Line, render, Stderr, Stdout } from 'decopin-cli';
import type { Renderable } from 'decopin-cli';

/** 装飾なしで描画する (文字の並びだけを見たいとき) */
function plain(node: Renderable) {
  return render(node, { color: { stdout: 0, stderr: 0 } });
}

describe('render — 文字列', () => {
  test('文字列をそのまま出し、末尾に改行を 1 つ足す', async () => {
    const result = await plain('hello');
    expect(result.stdout).toBe('hello\n');
    expect(result.stderr).toBe('');
  });

  test('<Line> は末尾に改行を付ける', async () => {
    const result = await plain(
      <>
        <Line>one</Line>
        <Line>two</Line>
      </>
    );
    expect(result.stdout).toBe('one\ntwo\n');
  });

  test('改行が二重に付かない', async () => {
    const result = await plain(<Line>only</Line>);
    expect(result.stdout).toBe('only\n');
  });

  test('<Br /> は空行になる', async () => {
    const result = await plain(
      <>
        <Line>a</Line>
        <Br />
        <Line>b</Line>
      </>
    );
    expect(result.stdout).toBe('a\n\nb\n');
  });

  test('数値は文字になり、null / undefined / false は何も描かない', async () => {
    const show = false;
    const result = await plain(
      <Line>
        {1}
        {null}
        {undefined}
        {show && 'hidden'}
        {2}
      </Line>
    );
    expect(result.stdout).toBe('12\n');
  });

  test('配列と入れ子の Fragment を平らにする', async () => {
    const result = await plain(
      <>
        {['a', 'b'].map((value) => (
          <Line key={value}>{value}</Line>
        ))}
      </>
    );
    expect(result.stdout).toBe('a\nb\n');
  });

  test('何も出さないツリーは空文字 (改行も足さない)', async () => {
    const result = await plain(null);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });
});

describe('render — コンポーネント', () => {
  test('関数コンポーネントを再帰的に評価する', async () => {
    function Greeting({ name }: { name: string }) {
      return <Line>hello, {name}</Line>;
    }
    const result = await plain(<Greeting name="alice" />);
    expect(result.stdout).toBe('hello, alice\n');
  });

  test('async コンポーネントを await する', async () => {
    async function Delayed() {
      await Promise.resolve();
      return <Line>later</Line>;
    }
    const result = await plain(<Delayed />);
    expect(result.stdout).toBe('later\n');
  });
});

describe('render — 出力先 (fd)', () => {
  test('既定は stdout', async () => {
    const result = await plain(<Line>out</Line>);
    expect(result.stdout).toBe('out\n');
    expect(result.stderr).toBe('');
  });

  test('<Stderr> の中身だけ stderr に行く', async () => {
    const result = await plain(
      <>
        <Line>result</Line>
        <Stderr>
          <Line>3 件スキップしました</Line>
        </Stderr>
      </>
    );
    expect(result.stdout).toBe('result\n');
    expect(result.stderr).toBe('3 件スキップしました\n');
  });

  test('<Stdout> で stderr の中から戻せる', async () => {
    const result = await plain(
      <Stderr>
        <Line>err</Line>
        <Stdout>
          <Line>out</Line>
        </Stdout>
      </Stderr>
    );
    expect(result.stdout).toBe('out\n');
    expect(result.stderr).toBe('err\n');
  });
});

describe('render — 終了コード', () => {
  test('宣言がなければ undefined', async () => {
    const result = await plain(<Line>x</Line>);
    expect(result.exitCode).toBeUndefined();
  });

  test('<Exit> の値を拾い、最後に評価されたものが勝つ', async () => {
    const result = await plain(
      <>
        <Exit code={2} />
        <Line>x</Line>
        <Exit code={3} />
      </>
    );
    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe('x\n');
  });
});
