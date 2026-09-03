import { relative } from 'node:path';

import { schemaToTypeText } from '../../../core/build/schema-introspect.ts';
import { toTypeText } from '../../../core/types/type-text.ts';
import type { OutputSpec } from '../output/spec.ts';

/**
 * `data.tsx` の戻り値の型 (ADR 25)。
 *
 * argv と違って中身を評価できない (I/O を伴う) ので、**TypeScript の推論を
 * 借りる**。生成した型に `import()` を書いておけば、data.tsx の戻り値が
 * そのまま `cmd.tsx` の props に届く。Compiler API は要らない
 */
export function dataTypeText(
  file: string | undefined,
  workDir: string,
  output?: OutputSpec
): string {
  // output.tsx があれば宣言が正 (ADR 28)。実行時に検証されるのはこちら
  if (output?.type !== undefined) return toTypeText(output.type);
  if (output?.schema !== undefined) return schemaToTypeText(output.schema).text;
  if (file === undefined) return 'never';
  const path = relative(workDir, file).split('\\').join('/');
  const specifier = path.startsWith('.') ? path : `./${path}`;
  return `Awaited<ReturnType<typeof import(${JSON.stringify(
    specifier
  )}).default>>`;
}
