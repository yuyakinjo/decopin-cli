/**
 * バンドルサイズの基準になる最小の CLI (ADR 24)。
 * 1 コマンド、組み込みは <Line> だけ。ここが増えたらフレームワーク側の増加
 */
import { Line } from 'decopin-cli';

export default function Hello() {
  return <Line>hello</Line>;
}
