---
title: argv.tsx
description: Declare arguments and options once; validation, --help, and types follow.
---

What you write in `argv.tsx` drives all three of validation, `--help`, and
**types**. You never write the validation library by hand.

```tsx
// app/hello/argv.tsx
import { Arg, Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Greet someone.">
      {/* the shorthand covers types without constraints */}
      <Arg
        name="name"
        type="string"
        default="world"
        description="who to greet"
      />
      <Option
        name="loud"
        alias="l"
        type="boolean"
        default={false}
        description="shout it"
      />

      {/* nest a Type.* child when you need constraints */}
      <Option name="times" alias="t" default={1} description="repeat count">
        <Type.Number min={1} max={5} integer />
      </Option>
      <Option name="style" default="plain" description="how to decorate">
        <Type.Enum values={['plain', 'bold', 'rainbow']} />
      </Option>
    </Argv>
  );
}
```

Nesting is what you want when the type itself recurses.

```tsx
// app/user/list/argv.tsx (excerpt)
<Option name="tag" description="filter by tag (repeatable)">
  <Type.Array>
    <Type.String minLength={1} />
  </Type.Array>
</Option>
```

## Dates

Dates come in two flavours, because a moment and a calendar day accept
different input and are not interchangeable.

```tsx
<Option name="at">
  <Type.Instant />        {/* 2026-08-28T14:30:00Z  -> Temporal.Instant */}
</Option>

<Option name="since">
  <Type.PlainDate min="2020-01-01" />  {/* 2026-08-28 -> Temporal.PlainDate */}
</Option>
```

`Type.Instant` needs an offset (`Z` or `+09:00`); `Type.PlainDate` refuses one.

`Type.Date` still works and still gives you a `Date`, but it is deprecated:
`decopin build` warns, and it is removed after 2027-08-29.

## Type and presence live at different levels

| What it decides              | Where it goes                                          |
| ---------------------------- | ------------------------------------------------------ |
| the type and its constraints | children (`Type.*`) or the `type` shorthand            |
| whether it can be omitted    | props on `<Arg>` / `<Option>` (`required` / `default`) |

`required` and `default` cannot both be set (with neither, the value is optional).

## The declaration is where your types come from

```tsx
import type { CmdProps } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'hello'>) {
  args.name; // string
  options.times; // number
  options.style; // "plain" | "bold" | "rainbow"
  return null;
}
```

So does `--help`.

```sh
$ ./dist/index.js hello --help
Usage: decopin-cli hello [name] [options]

Greet someone.

Arguments:
  name                              who to greet (default: "world")

Options:
  -l, --loud                        shout it (default: false)
  -t, --times <number>              repeat count (default: 1)
      --style <plain|bold|rainbow>  how to decorate (default: "plain")
  -h, --help                        show this help
```

Boolean aliases bundle: `-nu` is `-n -u`.

## Reserved names

`--help`, `-h`, `--version`, `--no-color`, `--json` and `--dry-run` belong to
the framework. Declaring any of them here is a build error. See
[Reserved options](/guides/reserved-options/).
