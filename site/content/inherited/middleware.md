---
title: middleware.tsx
description: Wrap the execution of every command below a directory. Nothing runs until you call next().
---

`middleware.tsx` wraps the execution. It is inherited like `layout.tsx`, and
`next` is a function, so nothing inside runs until you call it. That is what
makes "after the command" possible: timing, cleanup, or deciding not to run
at all.

```tsx
// app/user/middleware.tsx
import { Line, Stderr, Text, type MiddlewareProps } from 'decopin-cli';

export default async function Middleware({ next, options }: MiddlewareProps) {
  const started = performance.now();
  const output = await next();
  if (options.verbose !== true) return output;
  return (
    <>
      {output}
      <Stderr>
        <Line>
          <Text dim>took {Math.round(performance.now() - started)}ms</Text>
        </Line>
      </Stderr>
    </>
  );
}
```

Middleware receives the same validated `args`, `options`, `env` and `dryRun`
the command does, typed loosely (`Record<string, unknown>`) because one file
serves many commands.

## Order

Outer directories run first. `app/middleware.tsx` calls `next()`, which runs
`app/user/middleware.tsx`, which calls `next()`, which runs the command.
Returning without calling `next()` skips everything inside.

## Why next() and not children

A `children` prop would mean the command has already run by the time the
middleware sees it. The decision is recorded as ADR 13 in
[docs/decisions.md](https://github.com/yuyakinjo/decopin-cli/blob/main/docs/decisions.md).
