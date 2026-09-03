import { DeclarationError } from '../../../declaration/errors.ts';
import {
  presence,
  readString,
  requireName,
  resolveType,
} from '../../../declaration/parse-helpers.ts';
import type { HostNode } from '../../../declaration/resolve.ts';
import type { EnvSpec, VarSpec } from './spec.ts';

/** `env.tsx` の宣言を読む */
export function parseEnvSpec(hosts: HostNode[]): EnvSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'env') {
    throw new DeclarationError('env.tsx must return a single <Env> element');
  }
  const vars: VarSpec[] = [];
  const seen = new Set<string>();

  for (const child of hosts[0].children) {
    if (child.kind !== 'var') {
      throw new DeclarationError(
        `<Env> accepts <Var> children only, found <${child.displayName}>`
      );
    }
    const name = requireName(child);
    if (seen.has(name)) {
      throw new DeclarationError(`Duplicate <Var name="${name}">`);
    }
    seen.add(name);
    const { required, defaultValue } = presence(child, name);
    vars.push({
      name,
      description: readString(child, 'description'),
      required,
      defaultValue,
      type: resolveType(child, 'env'),
    });
  }

  if (vars.length === 0) {
    throw new DeclarationError('<Env> requires at least one <Var>');
  }
  return { vars };
}
