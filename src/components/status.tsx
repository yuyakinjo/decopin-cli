/**
 * 状態を表すプリセット。記号と色を組み合わせた 1 行を出す。
 * 記号そのものは `<Symbol>` で、UTF-8 でない端末では ASCII に落ちる。
 */
import type { Renderable } from '../jsx/types.ts';
import { Line, Symbol } from './index.ts';

/** 状態を表すプリセットが受け取る props */
export interface StatusProps {
  children?: Renderable;
}

/** 緑の ✔ */
export function Success({ children }: StatusProps): Renderable {
  return (
    <Line>
      <Symbol kind="success" /> {children}
    </Line>
  );
}

/** 黄の ⚠ */
export function Warn({ children }: StatusProps): Renderable {
  return (
    <Line>
      <Symbol kind="warn" /> {children}
    </Line>
  );
}

/** 青の ℹ */
export function Info({ children }: StatusProps): Renderable {
  return (
    <Line>
      <Symbol kind="info" /> {children}
    </Line>
  );
}

/** 赤の ✖ */
export function Danger({ children }: StatusProps): Renderable {
  return (
    <Line>
      <Symbol kind="danger" /> {children}
    </Line>
  );
}
