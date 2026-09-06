---
title: Setup errors
description: Say what is missing and the command that fixes it, in a field a machine can read too.
---

Two shapes every CLI ends up needing, both saying what is missing **and the
command that fixes it**:

```tsx
// app/publish/data.tsx
import { authRequired, missingTool, type CmdProps } from 'decopin-cli';

export default function Data({ env }: CmdProps<'publish'>) {
  if (env.DECOPIN_TOKEN === undefined) {
    authRequired({ service: 'the registry', fix: 'export DECOPIN_TOKEN=…' });
  }
  if (Bun.which('cosign') === null) {
    missingTool({
      tool: 'cosign',
      reason: 'to sign the package',
      install: 'brew install cosign',
    });
  }
  return { published: true };
}
```

```sh
$ ./dist/index.js publish
Setup needed: Not authenticated to the registry
  export DECOPIN_TOKEN=…
```

These are ordinary errors, so they travel the [`error.tsx`](/inherited/error/)
path and can be branched on with `error.kind` (`'auth'` / `'missing-tool'`).
The fix lines live on `error.hints`, and they reach `--json` as well:

```json
{
  "error": {
    "code": "auth",
    "message": "Not authenticated to the registry",
    "exitCode": 1,
    "hints": ["export DECOPIN_TOKEN=…"]
  }
}
```

That last part is the point. A person reading `gh auth login` knows what to do
next; an agent needs the same thing in a field it can read, which is why hints
are not only formatting.
