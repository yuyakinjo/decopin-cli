---
title: version.tsx
description: What --version prints.
---

`--version` is reserved by the framework. `version.tsx` at the root says what
it prints:

```tsx
// app/version.tsx
import { Version } from 'decopin-cli';

export default function DefineVersion() {
  return <Version name="decopin-cli" version="2026.904.857" />;
}
```

```sh
$ ./dist/index.js --version
decopin-cli 2026.904.857
```

`name` is optional; without it only the version is printed. The program name
shown in `Usage:` lines comes from `package.json` (or `--program` at build
time), not from this file. Without `version.tsx`, `--version` is an error
that tells you to add the file, so a CLI never reports a version nobody
declared.

In this repository, a test checks that the demo's `version.tsx` matches
`package.json`, because a stale example is the one people copy.
