---
title: stdin.tsx
description: A command without stdin.tsx never touches stdin. The one that does says what the input is.
---

**A command without `stdin.tsx` never touches stdin.** The most common CLI
accident, running a command in a terminal and having it hang on input you did
not know it wanted, cannot happen by construction.

```tsx
// app/count/stdin.tsx
import { Stdin } from 'decopin-cli';

export default function DefineStdin() {
  return <Stdin mode="lines" required />;
}
```

```tsx
// app/count/cmd.tsx
import { Line, type CmdProps } from 'decopin-cli';

export default function Command({ stdin }: CmdProps<'count'>) {
  // stdin is string[], because mode="lines" and required
  return <Line>{stdin.length}</Line>;
}
```

```sh
$ printf 'a\nb\n\nc\n' | ./dist/index.js count
4
```

## Modes

| `mode`  | What the command receives                                     |
| ------- | ------------------------------------------------------------- |
| `text`  | `string` (the whole input). `trim` drops the trailing newline |
| `lines` | `string[]` (split on newlines)                                |
| `json`  | the type you declared in children, otherwise `unknown`        |

## Optional and required

Without `required`, a command run in a terminal receives `undefined`, and the
type says `| undefined`, so code that forgets to handle it does not compile.

```tsx
// app/upper/cmd.tsx
import { Line, type CmdProps } from 'decopin-cli';

export default function Command({ stdin }: CmdProps<'upper'>) {
  // stdin is string | undefined
  return <Line>{(stdin ?? 'nothing piped').toUpperCase()}</Line>;
}
```

With `required`, a run in a terminal without a pipe is a usage error (exit 2)
instead of a hang. An empty pipe is still input: `count </dev/null` prints
`0`.

## Structured input

`mode="json"` takes the same `Type.*` children as `argv.tsx`, so structured
input gets the same treatment as arguments: validated before the command
runs, and typed from the declaration.

```tsx
// app/user/import/stdin.tsx
import { Stdin, Type } from 'decopin-cli';

export default function DefineStdin() {
  return (
    <Stdin mode="json" required>
      <Type.Array minItems={1}>
        <Type.Object>
          <Type.Field name="name" required>
            <Type.String minLength={1} />
          </Type.Field>
          <Type.Field name="admin" defaultValue={false}>
            <Type.Boolean />
          </Type.Field>
        </Type.Object>
      </Type.Array>
    </Stdin>
  );
}
```

```tsx
// app/user/import/cmd.tsx
import { Line, Text, type CmdProps } from 'decopin-cli';

export default function Command({ stdin }: CmdProps<'user/import'>) {
  // stdin is { name: string; admin: boolean }[]
  return (
    <>
      {stdin.map((user) => (
        <Line key={user.name}>
          {user.name}
          {user.admin ? <Text color="yellow"> (admin)</Text> : null}
        </Line>
      ))}
      <Line>
        <Text dim>imported {stdin.length}</Text>
      </Line>
    </>
  );
}
```

Input that does not match fails before the command runs, through the same
`error.tsx` chain as everything else, with `error.kind === 'stdin'`.

## Visible in --help

```sh
$ ./dist/index.js count --help
Usage: decopin-cli count [options]

Count lines coming from stdin.

Stdin:
  lines            required (pipe something in)
...
```

An [MCP tool](/guides/mcp/) built from a command with `stdin.tsx` gains a
`stdin` argument, so an agent can pass the input the pipe would have carried.
