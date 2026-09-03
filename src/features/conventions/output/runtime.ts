import { resolveHosts } from '../../../core/jsx/resolve.ts';
import type { Renderable } from '../../../core/jsx/types.ts';
import { CliError } from '../../../core/runtime/errors.ts';
import { EXIT_CODE } from '../../../core/runtime/exit.ts';
import { toSchema, validateValue } from '../../../core/validation/schema.ts';
import { parseOutputSpec } from './parse.ts';
import type { OutputSpec } from './spec.ts';

/** output.tsx を読み、実行時の出力宣言を組み立てる。 */
export async function loadOutputSpec(
  loader: (() => Promise<unknown>) | undefined,
  invalidDefaultExportError?: () => Error
): Promise<OutputSpec | undefined> {
  if (loader === undefined) return undefined;
  const loaded = (await loader()) as { default?: unknown };
  const declare = loaded.default;
  if (typeof declare !== 'function') {
    throw (
      invalidDefaultExportError?.() ??
      new CliError(
        'Output must default-export a function that returns <Output>'
      )
    );
  }
  const hosts = await resolveHosts(
    (declare as () => Renderable)() as Renderable
  );
  return parseOutputSpec(hosts);
}

/** output.tsx があれば、data.tsx の戻り値を宣言どおりか検証する。 */
export async function validateData(
  loader: (() => Promise<unknown>) | undefined,
  data: unknown
): Promise<unknown> {
  if (loader === undefined) return data;
  const spec = (await loadOutputSpec(loader)) as OutputSpec;
  const schema =
    spec.schema !== undefined
      ? (spec.schema as Parameters<typeof validateValue>[0])
      : toSchema(spec.type as NonNullable<typeof spec.type>);
  const result = validateValue(schema, data);
  if (!result.ok) {
    throw new CliError('data does not match output.tsx', {
      kind: 'validation',
      exitCode: EXIT_CODE.runtime,
      issues: result.messages,
    });
  }
  return result.value;
}
