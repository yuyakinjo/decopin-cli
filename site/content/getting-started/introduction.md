---
title: Introduction
description: What decopin-cli is, and the idea behind it.
---

Build CLIs the way Next.js builds web apps: file conventions, JSX output, and
types that come from your declarations. TypeScript + Bun.

Output is JSX. There is no React; decopin ships its own small renderer.

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

```sh
$ bun run build
$ ./dist/index.js hello world
hello, world
```

## The idea

A CLI has more inputs than argv. It reads stdin, or does not. It depends on
environment variables it never lists. Its error output changes shape two
subcommands down. In most CLIs these live inside the code, unstated, and the
type checker cannot see any of them.

decopin gives each of them a file with a fixed name. Every file you add does
two things: it changes what the command does, and it changes the type of
`CmdProps<'…'>` the next time `decopin build` or `decopin dev` runs. What you
leave out is not guessed.

And once the inputs are declared instead of implied, everything that reads a
declaration comes for free: `--help`, shell completion, the TypeScript types,
and [an MCP server the CLI already is](/guides/mcp/) — `mycli __mcp`, with no
tool definition to write and no second description to keep in sync.

There are three kinds of files, and they differ in where they may go:

| Kind            | Files                                                                                          | Where it goes                                     |
| --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Conventions** | `cmd.tsx` `argv.tsx` `data.tsx` `output.tsx` `stdin.tsx` `help.tsx` `shell.tsx` `complete.tsx` | next to the command; applies to that command only |
| **Inherited**   | `layout.tsx` `middleware.tsx` `error.tsx` `not-found.tsx`                                      | any directory; applies to everything below it     |
| **Root-only**   | `env.tsx` `version.tsx` `global-error.tsx`                                                     | `app/` only; applies to the whole CLI             |

Continue with [Setup](/getting-started/setup/), then
[Project structure](/getting-started/project-structure/).
