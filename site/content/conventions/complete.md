---
title: complete.tsx
description: Completion candidates that only exist at run time.
---

`bun run build` writes a zsh completion shim, and `Type.Enum` values complete
from the declaration (see [Shell completion](/guides/shell-completion/)). For
names that only exist at run time (a cluster, a branch, a user) add
`complete.tsx` next to the command.

It receives which argument is being completed and what has been typed so far,
and returns candidates; the framework filters by prefix and shows the
description next to each value:

```tsx
// app/deploy/complete.tsx
import type { CompleteProps } from 'decopin-cli';

export default async function Complete({ name, options }: CompleteProps) {
  if (name !== 'target') return [];
  // whatever is true right now: an API call, a git command, a directory listing
  const region = options.region?.[0] ?? 'ap-northeast-1';
  const targets = await listTargets(String(region));
  return targets.map((t) => ({ value: t.name, description: t.status }));
}

declare function listTargets(
  region: string
): Promise<{ name: string; status: string }[]>;
```

It runs only when Tab is pressed, so heavy imports (an AWS SDK, say) stay
out of `argv.tsx`. If it throws or takes longer than five seconds, completion
falls back to no candidates rather than an error at the prompt.
