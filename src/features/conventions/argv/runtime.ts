import { resolveHosts } from '../../../declaration/resolve.ts';
import type { Renderable } from '../../../jsx/types.ts';
import { CliError } from '../error/errors.ts';
import { parseArgvSpec } from './parse.ts';
import { EMPTY_ARGV_SPEC } from './spec.ts';
import type { ArgvSpec } from './spec.ts';

/** argv.tsx を読み、実行時の引数宣言を組み立てる。 */
export async function loadArgvSpec(
  loader: (() => Promise<unknown>) | undefined,
  invalidDefaultExportError?: () => Error
): Promise<ArgvSpec> {
  if (loader === undefined) return EMPTY_ARGV_SPEC;
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw (
      invalidDefaultExportError?.() ??
      new CliError(
        'argv.tsx must default-export a function that returns <Argv>'
      )
    );
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  return parseArgvSpec(hosts);
}
