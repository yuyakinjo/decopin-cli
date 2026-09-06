---
title: layout.tsx
description: Wrap the output of every command below a directory.
---

`layout.tsx` wraps the output. It is inherited: one in `app/user/` wraps
`user list`, `user import` and everything else under it, and one in `app/`
wraps the whole CLI. Layouts nest from the outside in, the way Next.js
layouts do.

```tsx
// app/user/layout.tsx
import { Line, Text, type LayoutProps } from 'decopin-cli';

export default function UserLayout({ children }: LayoutProps) {
  return (
    <>
      <Line>
        <Text bold>USERS</Text>
      </Line>
      {children}
    </>
  );
}
```

```sh
$ ./dist/index.js user list
USERS
alice
bob
```

## Opting out

A command that must not be wrapped (one whose output is consumed by a script,
say) exports `skipLayout`:

```tsx
import { Line } from 'decopin-cli';

export const skipLayout = true;

export default function Command() {
  return <Line>raw</Line>;
}
```

`--json` skips layouts on its own, since it prints data, not a view.

## Layout or middleware?

A layout sees the rendered output and can only add around it. When you need
to run code before or after the command, or to decide whether it runs at all,
use [`middleware.tsx`](/inherited/middleware/).
