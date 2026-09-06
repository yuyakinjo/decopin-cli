---
title: shell.tsx
description: cd and export in the parent shell, without writing shell.
---

A child process cannot `cd` for its parent or `export` into it. That is why
`z`, `direnv` and friends are shell functions. `shell.tsx` gives you the same
trick without writing shell: declare what should happen, and the framework
writes the shell code with the quoting done.

```tsx
// app/go/shell.tsx — receives the same props as cmd.tsx
import { Shell, type CmdProps } from 'decopin-cli';

export default function ShellChanges({ data }: CmdProps<'go'>) {
  return (
    <>
      <Shell.Cd to={data.path} />
      <Shell.Export name="DECOPIN_LAST_PLACE" value={data.place} />
    </>
  );
}
```

## Installing the hook

Install the hook once in your rc file, the way `zoxide init` works:

```sh
eval "$(mycli __shell zsh)"   # or bash
```

The hook is a function with the CLI's name. It runs the real binary with a
temp file path in `DECOPIN_SHELL_FILE`, and if the command succeeded and
wrote to it, sources the file. stdout and stderr are untouched, so pipes
keep working. Without the hook, the command still runs; it just tells you on
stderr that the shell changes were not applied.

## Components

`Shell.Cd`, `Shell.Export`, `Shell.Unset`, `Shell.Alias` and `Shell.Source`
quote their values; `Shell.Raw` passes code through verbatim when you need
something else.

Quoting is literal: `<Shell.Source file="$HOME/.zshrc" />` looks for a file
called `$HOME/.zshrc`, and `~` is not expanded either. Build the path in
TypeScript instead:

```tsx
import { homedir } from 'node:os';
import { join } from 'node:path';

import { Shell } from 'decopin-cli';

export default function ShellChanges() {
  return <Shell.Cd to={join(homedir(), 'workspace')} />;
}
```
