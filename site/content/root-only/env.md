---
title: env.tsx
description: Every environment variable the CLI reads, in one file, validated once at startup and typed.
---

Environment variables are the input nobody documents. They are read wherever
`process.env` happens to be mentioned, parsed as strings, and a missing or
misspelled one surfaces as a failure far from its cause. `env.tsx` is
root-only: one file lists every variable the CLI reads, and it is checked
once, before any command runs.

```tsx
// app/env.tsx
import { Env, Type, Var } from 'decopin-cli';

export default function DefineEnv() {
  return (
    <Env>
      <Var name="DECOPIN_LOG" default="info" description="log level">
        <Type.Enum values={['debug', 'info', 'warn', 'error']} />
      </Var>
      <Var name="DECOPIN_RETRIES" default={3} description="how many retries">
        <Type.Number min={0} max={10} integer />
      </Var>
      <Var name="DECOPIN_TOKEN" type="string" description="API token" />
    </Env>
  );
}
```

`<Var>` takes the same `Type.*` children and `type` shorthand as `<Option>`.
`required` and `default` follow the same rule: at most one of them, and with
neither the variable is optional.

## The env prop

Every command receives the validated result as `env`, already converted and
typed. A variable with a `default` is never `undefined`; one without is
optional, and the type says so:

```tsx
// app/config/cmd.tsx
import { KeyValue, type CmdProps } from 'decopin-cli';

export default function Command({ env }: CmdProps<'config'>) {
  return (
    <KeyValue
      data={{
        log: env.DECOPIN_LOG, // "debug" | "info" | "warn" | "error"
        retries: env.DECOPIN_RETRIES, // number, not string
        token: env.DECOPIN_TOKEN ?? '(not set)', // string | undefined
      }}
    />
  );
}
```

The same `env` reaches `data.tsx`, `middleware.tsx` and `shell.tsx`. The
generated type is a module augmentation of `EnvVars`, so `env.DECOPIN_LGO` is
a compile error.

## Failing fast

A bad value fails before the command, and says which variable and why. With
`--json` the same failure is structured (`code: "env"`), so a script calling
the CLI can tell a setup problem from a runtime one:

```sh
$ DECOPIN_LOG=verbose ./dist/index.js config
Invalid usage: DECOPIN_LOG: Invalid type: Expected ("debug" | "info" | "warn" | "error") but received "verbose"
exit code 2
```

```sh
$ DECOPIN_RETRIES=99 ./dist/index.js config --json
{
  "error": {
    "code": "env",
    "message": "DECOPIN_RETRIES: Invalid value: Expected <=10 but received 99",
    "exitCode": 2
  }
}
```

Reading `process.env` directly still works. The point of the file is that the
list of what the CLI depends on exists, in one place, and that the type
checker enforces it.

For variables that are not configuration but credentials, pair `env.tsx` with
[`authRequired()`](/guides/setup-errors/), which tells the user the command
that fixes it.
