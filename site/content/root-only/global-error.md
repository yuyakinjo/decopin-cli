---
title: global-error.tsx
description: The last error view, when no error.tsx caught it.
---

`global-error.tsx` is the end of the [`error.tsx`](/inherited/error/) chain.
It receives the same `ErrorProps`, and it is where a CLI decides how failures
look when no subtree had an opinion.

```tsx
// app/global-error.tsx
import { Line, Text, type ErrorKind, type ErrorProps } from 'decopin-cli';

const USAGE_KINDS: ErrorKind[] = ['validation', 'stdin', 'env'];
const SETUP_KINDS: ErrorKind[] = ['auth', 'missing-tool'];

function headline(kind: ErrorKind): string {
  if (USAGE_KINDS.includes(kind)) return 'Invalid usage';
  if (SETUP_KINDS.includes(kind)) return 'Setup needed';
  return 'Unexpected error';
}

export default function GlobalError({ error, exitCode }: ErrorProps) {
  return (
    <>
      <Line>
        <Text bold color="red">
          {headline(error.kind)}
        </Text>
        {': '}
        {error.issues[0] ?? error.message}
      </Line>
      {error.hints.map((hint) => (
        <Line key={hint}>
          {'  '}
          <Text color="cyan">{hint}</Text>
        </Line>
      ))}
      <Line>
        <Text dim>exit code {exitCode}</Text>
      </Line>
    </>
  );
}
```

Two things worth keeping in a custom view: `error.hints`, because they are the
commands that fix the problem, and `error.issues`, because a validation
failure can have more than one line.

If `global-error.tsx` itself throws, the built-in view takes over, so an
error view can never turn a failure into silence.
