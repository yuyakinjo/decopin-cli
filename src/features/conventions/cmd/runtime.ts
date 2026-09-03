import type { RenderInput } from '../../../core/jsx/types.ts';
import { CliError } from '../../../core/runtime/errors.ts';
import type { CommandContext } from './context.ts';

/** 読み込んだ cmd.tsx の実行関数とファイル単位の設定。 */
export interface LoadedCommand {
  command: (props: CommandContext) => RenderInput;
  skipLayout: boolean;
}

/** cmd.tsx を読み、default export が実行可能なコンポーネントか確認する。 */
export async function loadCommand(
  loader: () => Promise<unknown>,
  name: string
): Promise<LoadedCommand> {
  const loaded = (await loader()) as {
    default?: unknown;
    skipLayout?: unknown;
  };
  if (typeof loaded.default !== 'function') {
    throw new CliError(`Command "${name}" must default-export a component`);
  }
  return {
    command: loaded.default as (props: CommandContext) => RenderInput,
    skipLayout: loaded.skipLayout === true,
  };
}
