---
title: Reserved options
description: The flags the framework handles for every command.
---

`--help`, `-h`, `--version`, `--no-color`, `--json` and `--dry-run` are handled
by the framework. Declaring any of them in `argv.tsx` is a build error.

| Flag          | What it does                                                                      |
| ------------- | --------------------------------------------------------------------------------- |
| `--help` `-h` | prints usage to stdout, exit 0. Overridable with [`help.tsx`](/conventions/help/) |
| `--version`   | prints what [`version.tsx`](/root-only/version/) declares                         |
| `--no-color`  | disables colour even on a TTY (`NO_COLOR` and `TERM=dumb` do the same)            |
| `--json`      | skips the view and prints what [`data.tsx`](/conventions/data/) returned          |
| `--dry-run`   | sets `dryRun: true` on every command, `data.tsx` and middleware                   |

Two subcommand names are reserved as well, and hidden from help: `__complete`
(used by [shell completion](/guides/shell-completion/)) and `__mcp` (the
[MCP server](/guides/mcp/)). `__shell` prints the hook for
[`shell.tsx`](/conventions/shell/).

## --dry-run is the honest kind

The framework strips the flag and hands every command, `data.tsx` and
middleware a `dryRun: boolean`. It does not intercept file writes or network
calls for you. We measured: a static
`import { writeFile } from 'node:fs/promises'` binds at link time and never
sees a runtime patch, and Bun's bundler never lets a plugin redirect a builtin,
so any "automatic" dry run would silently miss the most common write API. A
flag that is trusted and then writes anyway is worse than no flag, so honouring
it is the command's job:

```tsx
// app/publish/data.tsx
import type { CmdProps } from 'decopin-cli';

export default function Data({ dryRun }: CmdProps<'publish'>) {
  return { published: !dryRun, dryRun };
}
```

## DECOPIN_DEBUG

Debug output is an environment variable, `DECOPIN_DEBUG=1`, rather than a
flag, so that `--verbose` and `--debug` stay free for your own options. See
[error.tsx](/inherited/error/#debugging).
