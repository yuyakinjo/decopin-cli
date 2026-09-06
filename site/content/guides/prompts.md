---
title: Prompts
description: Ask in the terminal, and only there. Anywhere else, instruct the machine instead.
---

`choose()` lets a command ask for one of a few values. It talks to the
terminal only: when stdin and stderr are both a TTY it draws the list on
stderr and returns the pick, typed as the literal union of what you passed.
Anywhere else (a pipe, an agent) it fails with exit 2 and the `hint`, so the
same command asks a person and instructs a machine:

```tsx
// app/deploy/cmd.tsx
import { choose, help, Success, type CmdProps } from 'decopin-cli';

const TARGETS = ['web', 'api', 'worker'] as const;

export default async function Command({ args }: CmdProps<'deploy'>) {
  let target = args.target;
  if (target === undefined) {
    try {
      target = await choose('Deploy which target?', TARGETS, {
        hint: 'Pass it as the first argument: deploy <target>',
      });
      //     ^? 'web' | 'api' | 'worker'
    } catch (error) {
      if (error instanceof Error) help({ message: 'give a target' });
      throw error;
    }
  }
  return <Success>deploying {target}</Success>;
}
```

Typing filters the list (case-insensitive substring), arrow keys move, Enter
selects; Esc or Ctrl+C exits with 130 and prints nothing. Long lists show a
window around the selection (`window`, default 10). stdout is never touched,
so `deploy web | cat` and `deploy | cat` both behave.

## ask() and confirm()

`ask()` and `confirm()` follow the same rules for a typed answer and a
yes/no:

```tsx
import { ask, confirm, Line } from 'decopin-cli';

export default async function Command() {
  const port = await ask('Local port?', {
    default: '8888',
    validate: (value) => (/^\d+$/.test(value) ? undefined : 'digits only'),
  });
  const retry = await confirm('Retry?', { default: true });
  return <Line>{`${port} ${String(retry)}`}</Line>;
}
```

## Why not read stdin

A prompt that read stdin would conflict with [`stdin.tsx`](/conventions/stdin/)
and would silently consume piped data. Prompts use the terminal device
directly, which is also what makes the "is anyone there?" check reliable.
