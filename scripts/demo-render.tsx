/**
 * Phase 1 の動作確認用のデモ。
 *
 *   bun scripts/demo-render.tsx              端末なので色が付く
 *   bun scripts/demo-render.tsx | cat        パイプなので色が落ちる
 *   NO_COLOR=1 bun scripts/demo-render.tsx   色を落とす
 *   bun scripts/demo-render.tsx 2>/dev/null  stderr だけ捨てる
 */
import { Br, Line, render, Stderr, Text, write } from 'decopin-cli';

const result = await render(
  <>
    <Line>
      <Text bold color="green">
        hello, world
      </Text>
    </Line>
    <Br />
    <Line>
      plain と{' '}
      <Text underline color="#ff8800">
        オレンジの下線
      </Text>{' '}
      が混ざる
    </Line>
    <Stderr>
      <Line>
        <Text color="yellow">これは stderr</Text>
      </Line>
    </Stderr>
  </>
);
write(result);
