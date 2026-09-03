import {
  isAsyncSchema,
  isValibotSchema,
} from '../../../core/build/schema-introspect.ts';
import type { HostNode } from '../../../core/jsx/resolve.ts';
import { DeclarationError } from '../../errors.ts';
import { onlyType } from '../../parse-helpers.ts';
import type { OutputSpec } from './spec.ts';

/**
 * `output.tsx` を評価する (ADR 28)。
 *
 * `Type.*` の子か `schema` prop のどちらか一方。stdin と同じ形にしてある
 */
export function parseOutputSpec(hosts: HostNode[]): OutputSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'output') {
    throw new DeclarationError(
      'output.tsx must return a single <Output> element'
    );
  }
  const node = hosts[0];
  const hasChildren = node.children.length > 0;
  const schema = node.props.schema;

  if (schema !== undefined) {
    if (hasChildren) {
      throw new DeclarationError(
        '<Output> cannot set both the "schema" prop and a Type.* child'
      );
    }
    if (!isValibotSchema(schema)) {
      throw new DeclarationError(
        '<Output schema> requires a valibot schema (e.g. v.object({ ... }))'
      );
    }
    if (isAsyncSchema(schema)) {
      throw new DeclarationError(
        '<Output schema> cannot take an async schema (validation runs synchronously)'
      );
    }
    return { schema };
  }

  if (!hasChildren) {
    throw new DeclarationError(
      '<Output> needs a Type.* child or a "schema" prop describing the data'
    );
  }
  return { type: onlyType(node) };
}
