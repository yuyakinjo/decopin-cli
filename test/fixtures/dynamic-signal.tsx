/**
 * シグナルでのカーソル復元 (ADR 22) を外から検証するための子プロセス。
 * 永遠に終わらない島を TTY として描き続け、親が SIGTERM を送る。
 */
import { Dynamic, Line, present } from 'decopin-cli';

async function* forever() {
  yield 'running';
  await new Promise(() => {});
}

await present(
  <Dynamic source={forever()}>{(value) => <Line>{value}</Line>}</Dynamic>,
  {
    isTTY: { stdout: false, stderr: true },
    env: { NO_COLOR: '1' },
    columns: 40,
  }
);
