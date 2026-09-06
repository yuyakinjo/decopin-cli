---
title: error.tsx
description: The view for a failure, looked up from the closest directory outward.
---

`error.tsx` is looked up **from the closest directory outward**.

```
app/user/create/error.tsx   ← the command's own directory (wins)
app/user/error.tsx          ← then each parent
app/global-error.tsx        ← the last resort
the built-in view           ← none of them exist, or all of them failed
```

```tsx
// app/user/error.tsx
import { Line, Text, type ErrorProps } from 'decopin-cli';

export default function UserError({ error }: ErrorProps) {
  return (
    <Line>
      <Text color="red">user: </Text>
      {error.issues[0] ?? error.message}
    </Line>
  );
}
```

Errors go to stderr by default. The exit code follows `error.kind`, and
`<Exit code={n} />` overrides it.

## What error.tsx receives

The framework wraps whatever was thrown into a `CliError` and keeps the
original on `error.cause`, so `error.tsx` can read it.

| Field           | What it is                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| `error.kind`    | `validation` `stdin` `env` `usage` `auth` `missing-tool` `runtime` `unknown` |
| `error.message` | the headline                                                                 |
| `error.issues`  | one line per problem, for validation failures                                |
| `error.hints`   | the commands that fix it (see [Setup errors](/guides/setup-errors/))         |
| `error.cause`   | what was originally thrown                                                   |
| `exitCode`      | what the process will exit with, unless `<Exit>` says otherwise              |

## Debugging

The default view prints only the message and hints. Set `DECOPIN_DEBUG=1` to
append the `cause` chain with stack traces after the error view (or as
`error.trace` under `--json`). It is an environment variable rather than a
flag so that `--verbose` and `--debug` stay free for your own options.

```
$ DECOPIN_DEBUG=1 ./dist/index.js stats
✖ database is down
CliError: database is down
    at toCliError (…)
Caused by: Error: database is down
    at Object.default (app/stats/data.tsx:4:9)
```

## Exit codes

| Code | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| 0    | success                                                               |
| 1    | runtime error (a throw inside `cmd.tsx`)                              |
| 2    | usage error (validation, unknown command, missing env, missing stdin) |
| 130  | Ctrl+C                                                                |

## Under --json

`error.tsx` is skipped under `--json`, and the failure is printed as
structured data on stderr instead. See
[Failures under --json](/conventions/data/#failures-under---json).
