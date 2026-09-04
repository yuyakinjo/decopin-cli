import type { CompleteProps } from 'decopin-cli';

import { users } from '../../_shared/users.ts';

// Candidates that only exist at run time (ADR 38). The framework filters by
// prefix, so return everything
export default function Complete({ name }: CompleteProps) {
  return name === 'name' ? users : [];
}
