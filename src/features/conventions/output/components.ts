import { host } from '../../../core/components/host.ts';
import type { Renderable } from '../../../core/jsx/types.ts';

/**
 * `data.tsx` が返す形の宣言 (ADR 28)。`Type.*` の子で組むか、
 * 込み入った形なら `schema` に valibot スキーマを直接渡す
 */
export interface OutputProps {
  /** valibot スキーマを直接渡す。children とは排他 */
  schema?: unknown;
  children?: Renderable;
}

/** 出力の形。あれば data が実行時に検証される */
export const Output = host<OutputProps>('output', 'Output');
