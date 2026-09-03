import type { HostNode } from '../../../core/jsx/resolve.ts';
import { DeclarationError } from '../../errors.ts';
import { readString } from '../../parse-helpers.ts';
import type { VersionSpec } from './spec.ts';

/** `version.tsx` の宣言を読む */
export function parseVersionSpec(hosts: HostNode[]): VersionSpec {
  if (hosts.length !== 1 || hosts[0]?.kind !== 'version') {
    throw new DeclarationError(
      'version.tsx must return a single <Version> element'
    );
  }
  const node = hosts[0];
  const version = readString(node, 'version');
  if (version === undefined || version === '') {
    throw new DeclarationError('<Version version> is required');
  }
  return { version, name: readString(node, 'name') };
}
