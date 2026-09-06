---
title: Project structure
description: The three kinds of files, where each may go, and what each one adds to the types.
---

```
app/
├── env.tsx               root-only: the environment, validated once at startup
├── version.tsx           root-only: what --version prints
├── global-error.tsx      root-only: the last resort
├── not-found.tsx         root-only when at the root: the view for an unknown command
├── hello/
│   ├── argv.tsx          convention: arguments and options
│   └── cmd.tsx           convention: the view
└── user/                 a directory without cmd.tsx is a group
    ├── error.tsx         inherited: list/ and import/ fail through here
    ├── layout.tsx        inherited: wraps their output
    ├── middleware.tsx    inherited: wraps their execution
    ├── list/
    │   ├── argv.tsx
    │   └── cmd.tsx
    └── import/
        ├── stdin.tsx     convention: this command reads stdin, and only this one
        └── cmd.tsx
```

Directories starting with `_` never become commands. Put shared code there.

## Conventions

A convention file sits next to `cmd.tsx` and applies to that command only.

| File                                     | What it does                                                  |
| ---------------------------------------- | ------------------------------------------------------------- |
| [`cmd.tsx`](/conventions/cmd/)           | the view. The only required file                              |
| [`argv.tsx`](/conventions/argv/)         | arguments and options: validation, `--help`, and types        |
| [`data.tsx`](/conventions/data/)         | computes; the return value arrives as `data`, and as `--json` |
| [`output.tsx`](/conventions/data/)       | declares what `data.tsx` promises, and checks it at run time  |
| [`stdin.tsx`](/conventions/stdin/)       | opts the command in to reading stdin, and says what it is     |
| [`help.tsx`](/conventions/help/)         | overrides `--help` for this command or group                  |
| [`shell.tsx`](/conventions/shell/)       | what the parent shell should do afterwards (`cd`, `export`)   |
| [`complete.tsx`](/conventions/complete/) | completion candidates that only exist at run time             |

## Inherited

An inherited file applies to every command below the directory it is in. The
closest one wins, and the chain continues outward.

| File                                       | What it does                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- |
| [`layout.tsx`](/inherited/layout/)         | wraps the output                                                 |
| [`middleware.tsx`](/inherited/middleware/) | wraps the execution. Nothing inside runs until you call `next()` |
| [`error.tsx`](/inherited/error/)           | the view for a failure                                           |
| [`not-found.tsx`](/inherited/not-found/)   | the view for `notFound()` and for an unknown subcommand          |

## Root-only

A root-only file lives in `app/` and applies to the whole CLI. Placing one
anywhere else is a build error.

| File                                           | What it does                                         |
| ---------------------------------------------- | ---------------------------------------------------- |
| [`env.tsx`](/root-only/env/)                   | declares environment variables, validated at startup |
| [`version.tsx`](/root-only/version/)           | what `--version` prints                              |
| [`global-error.tsx`](/root-only/global-error/) | the last error view when no `error.tsx` caught it    |

## Where the types come from

`decopin build` and `decopin dev` write `.decopin/types.d.ts` from the files
above. `CmdProps<'user/import'>` is the command's path, and each prop on it
traces back to one file:

| Prop      | Comes from                    | When the file is absent          |
| --------- | ----------------------------- | -------------------------------- |
| `args`    | `<Arg>` in `argv.tsx`         | `{}`                             |
| `options` | `<Option>` in `argv.tsx`      | `{}`                             |
| `stdin`   | `stdin.tsx`                   | `never`, and stdin is never read |
| `env`     | `env.tsx` at the root         | `{}`                             |
| `data`    | `data.tsx` (or `output.tsx`)  | `never`                          |
| `dryRun`  | the reserved `--dry-run` flag | always `boolean`                 |
| `argv`    | what was left after routing   | always `readonly string[]`       |
| `cwd`     | the working directory         | always `string`                  |

The generated file is a module augmentation of `decopin-cli`, so the same
import works before and after the first build. Before it, `args` and
`options` are `Record<string, unknown>`; after it they are exact.
