/**
 * 色を落とす条件の判定。
 * 副作用を持たない純粋な関数にして、テストから任意の環境を再現できるようにする。
 */
import type { ColorDepth } from './color.ts';

export interface ColorInput {
  /** 出力先が端末かどうか */
  isTTY: boolean;
  env: Record<string, string | undefined>;
  /** `--no-color` が渡されたか */
  noColorFlag?: boolean;
}

function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== '';
}

/**
 * 優先順 (test/renderer/capabilities.test.ts が表として固定している):
 * 1. FORCE_COLOR → 色を付ける (ただし 0 / false は「明示的に落とす」)
 * 2. NO_COLOR → 落とす
 * 3. --no-color → 落とす
 * 4. 非 TTY → 落とす
 * 5. TERM=dumb → 落とす
 */
export function resolveColorDepth(input: ColorInput): ColorDepth {
  const { env } = input;
  const force = env.FORCE_COLOR;

  if (isSet(force)) {
    // 0 / false を無効化として扱うのは既存 CLI の慣習に合わせたもの
    if (force === '0' || force === 'false') return 0;
    return depthFromTerm(env);
  }
  if (isSet(env.NO_COLOR)) return 0;
  if (input.noColorFlag === true) return 0;
  if (!input.isTTY) return 0;
  if (env.TERM === 'dumb') return 0;

  return depthFromTerm(env);
}

function depthFromTerm(env: Record<string, string | undefined>): ColorDepth {
  const colorterm = env.COLORTERM;
  if (colorterm === 'truecolor' || colorterm === '24bit') return 24;
  if (env.TERM?.includes('truecolor') === true) return 24;
  return 4;
}
