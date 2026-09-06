---
title: cmd.tsx
description: The view. The only file a command needs.
---

`cmd.tsx` is the one required file. It receives everything the other files
declared and returns JSX, which the renderer writes to the terminal.

```tsx
// app/hello/cmd.tsx
import { Line, Text, type CmdProps } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'hello'>) {
  return (
    <Line>
      <Text bold color="green">
        hello, {args.name}
      </Text>
    </Line>
  );
}
```

`CmdProps<'hello'>` is keyed by the command's path (`'user/import'` for
`app/user/import/cmd.tsx`). See
[where the types come from](/getting-started/project-structure/#where-the-types-come-from)
for the full list of props.

## Async commands

A command may be `async`. Output is written when the promise settles, unless
part of it opts in to [Partial Repainting](/guides/partial-repainting/).

```tsx
import { Line } from 'decopin-cli';

export default async function Command() {
  const res = await fetch('https://example.com');
  return <Line>{res.status}</Line>;
}
```

## Exports the framework reads

| Export                    | Effect                                                                       |
| ------------------------- | ---------------------------------------------------------------------------- |
| `export default`          | the command                                                                  |
| `export const skipLayout` | `true` opts this command out of every inherited `layout.tsx`                 |
| `export const unsafeEval` | `true` lets the command through `--strict-effects` (see [MCP](/guides/mcp/)) |

## Deprecated name

`command.tsx` (and `command.ts`) still works, but `decopin build` warns, and it
is removed after 2027-09-02. Rename to `cmd.tsx`.
