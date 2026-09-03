import {
  schemaToTypeText,
  type SchemaTypeResult,
} from '../../../core/build/schema-introspect.ts';
import { toTypeText } from '../../../core/types/type-text.ts';
import type { StdinSpec } from './spec.ts';

/** stdin.tsx の宣言から、command が受け取る値の型を決める (ADR 2) */
export function stdinType(stdin: StdinSpec | undefined): SchemaTypeResult {
  if (stdin === undefined) return { text: 'never', unsupported: [] };

  const introspected =
    stdin.mode === 'json' && stdin.schema !== undefined
      ? schemaToTypeText(stdin.schema)
      : undefined;

  const base =
    introspected !== undefined
      ? introspected.text
      : stdin.mode === 'text'
        ? 'string'
        : stdin.mode === 'lines'
          ? 'string[]'
          : stdin.type === undefined
            ? 'unknown'
            : toTypeText(stdin.type);

  // required でなければ、端末実行時に undefined が渡る。
  // unknown はどんな値も含むので、足しても意味が増えない
  const text =
    stdin.required || base === 'unknown' ? base : `${base} | undefined`;
  return { text, unsupported: introspected?.unsupported ?? [] };
}

/** 型テキストだけが欲しい場合 */
export function stdinTypeText(stdin: StdinSpec | undefined): string {
  return stdinType(stdin).text;
}
