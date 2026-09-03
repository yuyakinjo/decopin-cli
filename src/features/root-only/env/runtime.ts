import { resolveHosts } from '../../../core/jsx/resolve.ts';
import type { Renderable } from '../../../core/jsx/types.ts';
import { CliError } from '../../../core/runtime/errors.ts';
import { EXIT_CODE } from '../../../core/runtime/exit.ts';
import { parseEnvSpec } from './parse.ts';
import { validateEnv } from './validation.ts';

/** env.tsx を読み、起動時の環境変数を検証する。 */
export async function loadEnv(
  loader: (() => Promise<unknown>) | undefined,
  source: Record<string, string | undefined>
): Promise<Record<string, unknown>> {
  if (loader === undefined) return {};
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw new CliError('Env must default-export a function that returns <Env>');
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  const validated = validateEnv(parseEnvSpec(hosts), source);
  if (!validated.ok) {
    throw new CliError(validated.issues[0] ?? 'Invalid environment', {
      kind: 'env',
      exitCode: EXIT_CODE.usage,
      issues: validated.issues,
    });
  }
  return validated.value;
}
