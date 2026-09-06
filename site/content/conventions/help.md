---
title: help.tsx and help()
description: Override what --help prints, and show it yourself when the input cannot be acted on.
---

`--help` is generated from `argv.tsx` (and `stdin.tsx`). `help.tsx` lets a
command, or a group, add to it or replace it. The generated text arrives as
`auto`, so the common case is appending examples:

```tsx
// app/count/help.tsx
import { Br, Line, Text, type HelpProps } from 'decopin-cli';

export default function Help({ auto, program, command }: HelpProps) {
  return (
    <>
      {auto}
      <Br />
      <Line>
        <Text bold>Examples:</Text>
      </Line>
      <Line>{`  cat file.txt | ${program} ${command}`}</Line>
      <Line>{`  git status --porcelain | ${program} ${command} -n`}</Line>
    </>
  );
}
```

`help.tsx` is per directory, not inherited. A group directory (one without
`cmd.tsx`) can have one too, and it decorates the command listing.

Asking for `--help` explicitly prints to stdout and exits 0. Ending up without
a command prints to stderr and exits 2.

## help(): when the input cannot be acted on

`help()` shows this command's usage and stops. It builds the same thing
`--help` does, including a `help.tsx` override, but since it was not asked
for, it goes to stderr with exit 2, matching how the framework already treats
misuse.

```tsx
// app/deploy/cmd.tsx
import { help, Success, type CmdProps } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'deploy'>) {
  if (args.target === undefined && !options.all) {
    help({ message: 'give a target, or pass --all' });
  }
  return (
    <Success>deploying {options.all ? 'everything' : args.target}</Success>
  );
}
```

```sh
$ ./dist/index.js deploy          # exit 2, all of it on stderr
✖ give a target, or pass --all
Usage: decopin-cli deploy [target] [options]

Deploy a target, or everything with --all.
...
```
