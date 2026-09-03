import { CliError } from '../../../core/runtime/errors.ts';
import type { CommandContext } from '../cmd/context.ts';

/** data.tsx を呼び、表示より先にデータを作る。 */
export async function loadData(
  loader: (() => Promise<unknown>) | undefined,
  context: Omit<CommandContext, 'data'>
): Promise<unknown> {
  if (loader === undefined) return undefined;
  const loaded = (await loader()) as { default?: unknown };
  const provide = loaded.default;
  if (typeof provide !== 'function') {
    throw new CliError('data.tsx must default-export a function');
  }
  return await (provide as (props: Omit<CommandContext, 'data'>) => unknown)(
    context
  );
}
