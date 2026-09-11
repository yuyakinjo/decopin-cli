---
title: data.tsx and output.tsx
description: Split computing from displaying, get --json for free, and declare the shape of what you return.
---

A command can split in two: `data.tsx` computes, `cmd.tsx` displays. The
return value of `data.tsx` arrives as the `data` prop, fully typed, with no
annotation needed, because the generated types read it back through
TypeScript's own inference.

```tsx
// app/stats/data.tsx
import type { CmdProps } from 'decopin-cli';

export default function Data({ options }: CmdProps<'stats'>) {
  const files = ['README.md', 'package.json'];
  return { files, total: files.length };
}
```

```tsx
// app/stats/cmd.tsx
import { KeyValue, List, type CmdProps } from 'decopin-cli';

export default function Command({ data }: CmdProps<'stats'>) {
  // data.files is string[], data.total is number
  return (
    <>
      <List items={data.files} />
      <KeyValue data={{ total: data.total }} />
    </>
  );
}
```

Splitting buys you `--json`, which is reserved by the framework: it skips the
view and prints what `data.tsx` returned.

```sh
$ ./dist/index.js stats --json
{
  "files": [
    "README.md",
    "package.json"
  ],
  "total": 2
}
```

## Declaring the shape with output.tsx

`output.tsx` declares what `data.tsx` promises. When present it becomes the
source of truth: the `data` prop is typed from the declaration rather than
inferred, and the value is checked at runtime before anything is displayed
or printed.

```tsx
// app/stats/output.tsx
import { Output, Type } from 'decopin-cli';

export default function DefineOutput() {
  return (
    <Output>
      <Type.Object>
        <Type.Field name="total" required>
          <Type.Number min={0} integer />
        </Type.Field>
        <Type.Field name="files" required>
          <Type.Array>
            <Type.String minLength={1} />
          </Type.Array>
        </Type.Field>
      </Type.Object>
    </Output>
  );
}
```

Checking data your own code produced is worth it when it did not really come
from your code: `return (await res.json()) as User[]` type-checks whether or
not the response matches. `output.tsx` is the one place that boundary gets
examined. Commands without one keep the inferred type and no check. For
awkward shapes, pass a valibot schema instead: `<Output schema={v.object(…)} />`.

The declaration also becomes the `outputSchema` of the command's
[MCP tool](/guides/mcp/).

## DataResult: the declaration, checked while you type

With an `output.tsx` in place, `data.tsx` can name what it returns. Then a
value that disagrees with the declaration fails to type-check, before the
runtime check ever runs:

```tsx
// app/stats/data.tsx
import type { CmdProps, DataResult } from 'decopin-cli';

export default function Data({
  options,
}: CmdProps<'stats'>): DataResult<'stats'> {
  const files = ['README.md', 'package.json'];
  const shown =
    options.limit === undefined ? files : files.slice(0, options.limit);
  // leave out a declared field, or get one wrong, and tsc says so here
  return { counted: shown.length, total: files.length, files: shown };
}
```

`decopin dev` writes that annotation for you. It is added only when the
command has an `output.tsx`: without one, the `data` prop's type is inferred
from this function's return value, so annotating it here would make the type
refer to itself. Before `decopin build` has generated types,
`DataResult<'…'>` is `unknown`, so a fresh checkout still type-checks.

## What --json refuses

`--json` refuses to print data that would not survive the round trip, and
names the path rather than letting it break quietly:

```sh
$ ./dist/index.js stats --json
data.lookup cannot go into --json: Map becomes {} in JSON
```

`JSON.stringify` drops functions and `undefined`, turns `Map` and `Set` into
`{}`, and turns `NaN` into `null`, all without complaining. `Date` and
`Temporal` values become strings that the declared type never mentions. Export
plain data, or convert at the edge (`when: when.toISOString()`). The `JsonValue`
type is exported if you would rather assert it yourself with `satisfies`.

## Failures under --json

When a command fails under `--json`, the failure is structured too, on
stderr, with stdout left empty:

```sh
$ ./dist/index.js stats --limit 99 --json
{
  "error": {
    "code": "validation",
    "message": "--limit: Invalid value: Expected <=3 but received 99",
    "exitCode": 2
  }
}
```

Asking for JSON and getting a human-formatted error back would break the
parser on the other end, so `error.tsx` is skipped here for the same reason
the view is. `code` is what a caller should branch on: messages get reworded,
categories do not. `exitCode` is repeated in the body because a caller reading
through a pipe cannot see `$?` (in `cmd | jq`, that belongs to jq).

## Piping does not switch to JSON

Dropping colour when stdout is not a terminal adjusts presentation; changing
the output _format_ would break `cli stats | grep README`, so it happens only
when asked. A command without a `data.tsx` exits 2 on `--json` and tells you
where to put the file.
