---
title: example.tsx
description: Declare runnable examples; decopin docs runs them and pastes the output.
---

`decopin docs` turns `app/` into a Markdown reference: every command, how to
call it, and — for commands that declare examples — what they actually print.
The examples are declared in `example.tsx` next to the command:

```tsx
// app/hello/example.tsx
import type { CommandExample } from 'decopin-cli';

export default [
  { args: ['world'], description: 'the shortest form' },
  { args: ['world', '--times', '3'], description: 'repeat the greeting' },
] satisfies CommandExample[];
```

Each entry is the argv you would type after the command name, plus an optional
one-line `description`. Nothing else is needed: the name, the arguments and the
options are already declared in `cmd.tsx` and `argv.tsx`.

## Generating the document

```sh
decopin docs                 # write Markdown to stdout
decopin docs --out DOCS.md   # write it to a file
decopin docs --no-run        # skip the examples, document the usage only
```

Commands without an `example.tsx` are documented but **never executed**.
Generating a document should not be a way to trigger side effects, so only what
you declared is run.

## Failing examples

An example that exits non-zero is not an error in the generator. Its exit code
and output are written into the document as a failure, and the rest of the
document is produced as usual — a stale example is easier to notice when it is
visible in the docs than when it stops the build.
