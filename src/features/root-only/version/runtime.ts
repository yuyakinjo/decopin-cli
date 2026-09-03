import { resolveHosts } from '../../../declaration/resolve.ts';
import type { Renderable } from '../../../jsx/types.ts';
import { CliError } from '../../conventions/error/errors.ts';
import { parseVersionSpec } from './parse.ts';
import type { VersionSpec } from './spec.ts';

/** version.tsx を読み、`--version` に出す宣言を返す。 */
export async function loadVersionSpec(
  loader: () => Promise<unknown>,
  invalidDefaultExportError?: () => Error
): Promise<VersionSpec> {
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw (
      invalidDefaultExportError?.() ??
      new CliError(
        'Version must default-export a function that returns <Version>'
      )
    );
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  return parseVersionSpec(hosts);
}
