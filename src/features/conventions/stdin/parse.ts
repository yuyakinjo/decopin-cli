import {
  isAsyncSchema,
  isValibotSchema,
} from '../../../core/build/schema-introspect.ts';
import { DeclarationError } from '../../../core/errors.ts';
import type { HostNode } from '../../../core/jsx/resolve.ts';
import { onlyType, readBoolean, readString } from '../../parse-helpers.ts';
import type { StdinSpec } from './spec.ts';

/** `stdin.tsx` の宣言を読む (ADR 2) */
export function parseStdinSpec(hosts: HostNode[]): StdinSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'stdin') {
    throw new DeclarationError(
      'stdin.tsx must return a single <Stdin> element'
    );
  }
  const node = hosts[0];
  const mode = readString(node, 'mode');
  if (mode !== 'text' && mode !== 'lines' && mode !== 'json') {
    throw new DeclarationError(
      '<Stdin mode> must be "text", "lines", or "json"'
    );
  }

  const hasChildren = node.children.length > 0;
  if (hasChildren && mode !== 'json') {
    throw new DeclarationError(
      `<Stdin mode="${mode}"> takes no children. Only mode="json" can declare a structure`
    );
  }

  const schema = node.props.schema;
  if (schema !== undefined) {
    if (hasChildren) {
      throw new DeclarationError(
        '<Stdin> cannot set both the "schema" prop and a Type.* child'
      );
    }
    if (mode !== 'json') {
      throw new DeclarationError(
        `<Stdin mode="${mode}"> cannot take a "schema" prop. Only mode="json" can`
      );
    }
    if (!isValibotSchema(schema)) {
      throw new DeclarationError(
        '<Stdin schema> requires a valibot schema (e.g. v.object({ ... }))'
      );
    }
    if (isAsyncSchema(schema)) {
      throw new DeclarationError(
        '<Stdin schema> cannot take an async schema (validation runs synchronously)'
      );
    }
  }

  return {
    mode,
    required: readBoolean(node, 'required') ?? false,
    trim: readBoolean(node, 'trim') ?? false,
    type: hasChildren ? onlyType(node) : undefined,
    schema,
  };
}
