---
title: Shell completion
description: A zsh shim that asks the CLI itself, so it never goes stale.
---

`bun run build` also writes a zsh completion shim to
`dist/completions/_<bin>`. Put it on your `$fpath` (before `compinit` runs)
and Tab completion works for subcommands, option names, and `Type.Enum`
values:

```sh
mkdir -p ~/.zsh/completions
cp dist/completions/_mycli ~/.zsh/completions/
# in .zshrc, before compinit:
#   fpath=(~/.zsh/completions $fpath)
```

The shim is thin on purpose: on every Tab it asks the CLI itself
(`mycli __complete`) for candidates, so the file never changes when you
add or remove commands. Rebuilding the CLI is enough, and zsh's
completion cache never goes stale. `__complete` is reserved by the
framework and hidden from help. When there are no candidates, completion
falls back to filenames.

## Candidates that only exist at run time

`Type.Enum` values complete from the declaration. For names that only exist
at run time (a cluster, a branch, a user) add
[`complete.tsx`](/conventions/complete/) next to the command.
