---
title: not-found.tsx and notFound()
description: One view for an unknown subcommand and for a value the command could not find, with the suggestion worked out for you.
---

`notFound()` can be called from anywhere in a command. It renders the nearest
`not-found.tsx` and picks the exit code, and if you hand it the valid values it
works out the suggestion for you:

```tsx
// app/user/show/data.tsx
import { notFound, type CmdProps } from 'decopin-cli';

const USERS = ['alice', 'bob', 'carol'];

export default function Data({ args }: CmdProps<'user/show'>) {
  if (!USERS.includes(args.name)) {
    notFound({ what: 'user', requested: args.name, available: USERS });
  }
  return { name: args.name };
}
```

```sh
$ ./dist/index.js user show alcie
✖ no such user: alcie
Did you mean: alice?
```

`not-found.tsx` is inherited from parent directories the way `error.tsx` is, so
a subcommand can have its own wording. One view serves both cases, an unknown
command and a `notFound()` call, and tells them apart with `what`. Under
`--json` the failure is structured with `code: "not-found"`.

```tsx
// app/not-found.tsx
import { Danger, DidYouMean, type NotFoundProps } from 'decopin-cli';

export default function NotFound({
  what,
  requested,
  suggestion,
  available,
  program,
}: NotFoundProps) {
  const isCommand = what === 'command';
  return (
    <>
      <Danger>
        no such {what}: {requested}
      </Danger>
      <DidYouMean
        requested={requested}
        from={
          isCommand ? available.map((name) => `${program} ${name}`) : available
        }
        suggestion={
          suggestion === undefined || !isCommand
            ? suggestion
            : `${program} ${suggestion}`
        }
        label={isCommand ? 'available commands' : `available ${what}s`}
      />
    </>
  );
}
```

At the root, `not-found.tsx` is also the view for a command that does not
exist at all (`cli usre list`), which is why it is listed under both
inherited and root-only files.

## Using the suggestion machinery yourself

The suggestion machinery is exported rather than kept inside the framework, so
you can use it for your own values:

```tsx
import { closest, DidYouMean, Line, Text } from 'decopin-cli';

const REGIONS = ['us-east-1', 'eu-west-1'];

export default function Command() {
  const asked = 'us-east-2';
  return (
    <>
      <Line>
        <Text dim>closest: {closest(asked, REGIONS)}</Text>
      </Line>
      <DidYouMean requested={asked} from={REGIONS} label="known regions" />
    </>
  );
}
```
