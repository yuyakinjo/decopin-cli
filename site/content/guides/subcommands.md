---
title: Subcommands
description: The directory tree is the subcommand tree.
---

The directory tree is the subcommand tree. A directory without a `cmd.tsx`
is a group, and it lists what is under it.

```
app/user/list/cmd.tsx     → cli user list
app/user/import/cmd.tsx   → cli user import
```

```sh
$ ./dist/index.js user
Usage: decopin-cli user <command> [options]

Commands:
  import  Import users from JSON on stdin.
  list    List users. (default: --limit=10, --verbose=false)
  show    Show one user, or suggest a close name.

Run "decopin-cli user <command> --help" for details.
```

The list carries each command's `description`, and every argument or option
that has a `default` is spelled out, so nothing happens implicitly when a flag
is left off.

Asking for `--help` explicitly prints to stdout and exits 0. Ending up without a
command prints to stderr and exits 2.

## Groups can have files too

A group directory holds the [inherited files](/getting-started/project-structure/#inherited)
for everything below it, and a [`help.tsx`](/conventions/help/) that
decorates its listing. It cannot hold `argv.tsx`, `stdin.tsx` or the other
per-command conventions, because there is no command for them to describe.

## Unknown subcommands

`cli user shwo` renders the nearest [`not-found.tsx`](/inherited/not-found/)
with the closest match as a suggestion, and exits 2.

## Shared code

Directories starting with `_` never become commands. `app/_shared/` is the
usual place for code several commands import.
