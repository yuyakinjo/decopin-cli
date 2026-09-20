# decopin-cli

[![npm version](https://img.shields.io/npm/v/decopin-cli)](https://www.npmjs.com/package/decopin-cli)
[![License](https://img.shields.io/npm/l/decopin-cli)](https://www.npmjs.com/package/decopin-cli)

## What is decopin-cli?

Build CLIs the way Next.js builds web apps: file conventions, JSX output, and
types that come from your declarations. TypeScript + Bun.

Most CLIs keep their real interface implicit. The arguments are declared, but
whether the command reads stdin, which environment variables it needs, the
shape of what it prints and whether it touches the disk all live inside the
code, unstated. decopin gives each of them a file with a fixed name, which
makes the interface a declaration — and **anything that can read a
declaration then comes for free**: `--help`, shell completion, the TypeScript
types, and an MCP server the CLI already is. There is no second definition to
keep in sync, because there is no second definition.

Output is JSX. There is no React — decopin ships its own small renderer.

```tsx
// app/hello/cmd.tsx
import { Line, Text, type CmdProps } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'hello'>) {
  return (
    <Line>
      <Text bold color="green">
        hello, {args.name}
      </Text>
    </Line>
  );
}
```

```sh
$ bun run build
$ ./dist/index.js hello world
hello, world
```

## Setup

```sh
bunx decopin-cli init my-cli   # or `init` alone for the current folder
cd my-cli
bun run build
./dist/index.js hello          # hello, world
```

Add files to an existing project with `gen`:

```sh
bunx decopin-cli gen --conv cmd --path app/hello
bunx decopin-cli gen --conv argv --path app/hello
bunx decopin-cli gen --inherited layout --path app/user
bunx decopin-cli gen --root-only env --path app
bunx decopin-cli gen --help
```

Choose one of `--conv`, `--inherited`, or `--root-only`; the help lists all
supported names. `--path` is a directory relative to the current working
directory and defaults to the app root. Use `--app src/app` for a custom root
(and `--path src/app/hello` for a command inside it). Root-only files must go
at that root. Inherited files use the same templates as their convention
counterparts and apply to the subtree where they are placed. Each invocation
creates one `.tsx` file and any missing directories. Existing `.tsx`, `.ts`,
and legacy `command` files are kept. Run `bun run build` afterward.

To set things up by hand instead

```sh
bun add decopin-cli
bun add -d @types/bun
```

Your `tsconfig.json` needs the JSX settings. **Without them TypeScript and Bun
both look for React** and the build fails with `Could not resolve:
react/jsx-runtime` (`decopin build` / `decopin dev` warn you about these two
settings, unless your tsconfig uses `extends`).

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "decopin-cli/jsx",
    "moduleResolution": "bundler",
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["app/**/*", ".decopin/types.d.ts"]
}
```

```sh
bunx decopin build   # scan app/ and produce dist/index.js
bunx decopin dev     # watch app/ and rebuild types + dist/index.js on every save
bunx decopin docs    # write a Markdown reference for every command to stdout
```

`build` prints what it found, one node per command, so the file conventions
that produced the CLI are readable right where they took effect:

```
Found 3 command(s)
Route (app)
┌ hello
│   ƒ cmd.tsx  ƒ argv.tsx
├ user/import
│   ƒ cmd.tsx  ƒ argv.tsx  ƒ stdin.tsx  ↑ user/error.tsx  ↑ user/layout.tsx
└ user/list
    ƒ cmd.tsx  ƒ argv.tsx  ↑ user/error.tsx  ↑ user/layout.tsx

Root (app)
    ¤ global-error.tsx  ¤ env.tsx

ƒ  convention   placed in the command's own directory
↑  inherited    comes from a directory above
¤  root-only    applies to every command
```

Each file carries a one-character marker for where it came from, and the
legend under the tree spells them out. Files that apply to every command,
like the root-only ones, are listed once at the bottom instead of on every
node. On a terminal without UTF-8 the markers fall back to `f`, `^` and `*`.

## Files, not configuration

A CLI has more inputs than argv. It reads stdin, or does not. It depends on
environment variables it never lists. Its error output changes shape two
subcommands down. In most CLIs these live inside the code, unstated, and the
type checker cannot see any of them.

decopin gives each of them a file with a fixed name. There are three kinds,
and they differ in where they may go:

| Kind            | Files                                                                                                        | Where it goes                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Conventions** | `cmd.tsx` `argv.tsx` `data.tsx` `output.tsx` `stdin.tsx` `help.tsx` `shell.tsx` `complete.tsx` `example.tsx` | next to the command; applies to that command only |
| **Inherited**   | `layout.tsx` `middleware.tsx` `error.tsx` `not-found.tsx`                                                    | any directory; applies to everything below it     |
| **Root-only**   | `env.tsx` `version.tsx` `global-error.tsx`                                                                   | `app/` only; applies to the whole CLI             |

```
app/
├── env.tsx               root-only: the environment, validated once at startup
├── version.tsx           root-only: what --version prints
├── global-error.tsx      root-only: the last resort
├── hello/
│   ├── argv.tsx          convention: arguments and options
│   └── cmd.tsx           convention: the view
└── user/                 a directory without cmd.tsx is a group
    ├── error.tsx         inherited: list/ and import/ fail through here
    ├── layout.tsx        inherited: wraps their output
    ├── list/
    │   ├── argv.tsx
    │   └── cmd.tsx
    └── import/
        ├── stdin.tsx     convention: this command reads stdin, and only this one
        └── cmd.tsx
```

Every file you add does two things. It changes what the command (or the
subtree, or the whole CLI) does, and it changes the type of `CmdProps<'…'>`
the next time `decopin build` or `decopin dev` runs. What you leave out is not
guessed: a command without `stdin.tsx` gets `stdin: never`, and never reads it.

### Declared once, and the machines read it

Because the inputs are declared instead of implied, the CLI is already an MCP
server. Run it with the reserved `__mcp` command and an agent host can list
and call your commands:

```json
{
  "mcpServers": {
    "mycli": { "command": "mycli", "args": ["__mcp"] }
  }
}
```

Nothing new to declare, and nothing to annotate. `argv.tsx` is the
`inputSchema`, `output.tsx` is the `outputSchema`, `data.tsx` is the
`structuredContent`, `env.tsx` says what a call needs, and the tool
`annotations` (`readOnlyHint`, `openWorldHint`) come from `decopin build`
counting which side effects each command can reach — a proven absence, not an
assertion. `--strict-effects` turns that into a build-time guarantee. A
command whose point is to change the parent shell (`shell.tsx`) is left out,
because under an MCP host there is no parent shell to change. The full
mechanics are in the
[MCP guide](https://yuyakinjo.github.io/decopin-cli/guides/mcp/).

The directory tree is also the subcommand tree, and a group lists what is
under it, with each command's description and defaults:

```sh
$ ./dist/index.js user
Usage: decopin-cli user <command> [options]

Commands:
  import  Import users from JSON on stdin.
  list    List users. (default: --limit=10, --verbose=false)
  show    Show one user, or suggest a close name.

Run "decopin-cli user <command> --help" for details.
```

### argv.tsx, briefly

Arguments are the one input every CLI library declares, so this is the
familiar part. What you write in `argv.tsx` drives validation, `--help`, and
the types, and you never touch the validation library:

```tsx
// app/hello/argv.tsx
import { Arg, Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Greet someone.">
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

```tsx
import type { CmdProps } from 'decopin-cli';

export default function Command({ args, options }: CmdProps<'hello'>) {
  args.name; // string
  options.times; // number
  options.style; // "plain" | "bold" | "rainbow"
  return null;
}
```

The two files below are the ones that do the same for inputs a CLI usually
leaves implicit. The rest are covered in the
[documentation](https://yuyakinjo.github.io/decopin-cli/).

## stdin.tsx: does this command read stdin?

**A command without `stdin.tsx` never touches stdin.** The most common CLI
accident, running a command in a terminal and having it hang on input you did
not know it wanted, cannot happen by construction. The file that opts in also
says what the input is:

```tsx
// app/count/stdin.tsx
import { Stdin } from 'decopin-cli';

export default function DefineStdin() {
  return <Stdin mode="lines" required />;
}
```

```tsx
// app/count/cmd.tsx
import { Line, type CmdProps } from 'decopin-cli';

export default function Command({ stdin }: CmdProps<'count'>) {
  // stdin is string[], because mode="lines" and required
  return <Line>{stdin.length}</Line>;
}
```

```sh
$ printf 'a\nb\n\nc\n' | ./dist/index.js count
4
```

| `mode`  | What the command receives                                     |
| ------- | ------------------------------------------------------------- |
| `text`  | `string` (the whole input). `trim` drops the trailing newline |
| `lines` | `string[]` (split on newlines)                                |
| `json`  | the type you declared in children, otherwise `unknown`        |

Without `required`, a command run in a terminal receives `undefined`, and the
type says `| undefined`, so the code that forgets to handle it does not
compile. With `required`, a run without a pipe is a usage error (exit 2)
instead of a hang.

`mode="json"` takes the same `Type.*` children as `argv.tsx`, so structured
input gets the same treatment as arguments: validated before the command
runs, and typed from the declaration.

```tsx
// app/user/import/stdin.tsx
import { Stdin, Type } from 'decopin-cli';

export default function DefineStdin() {
  return (
    <Stdin mode="json" required>
      <Type.Array minItems={1}>
        <Type.Object>
          <Type.Field name="name" required>
            <Type.String minLength={1} />
          </Type.Field>
          <Type.Field name="admin" defaultValue={false}>
            <Type.Boolean />
          </Type.Field>
        </Type.Object>
      </Type.Array>
    </Stdin>
  );
}
```

```tsx
// app/user/import/cmd.tsx
import { Line, type CmdProps } from 'decopin-cli';

export default function Command({ stdin }: CmdProps<'user/import'>) {
  // stdin is { name: string; admin: boolean }[]
  return <Line>imported {stdin.length}</Line>;
}
```

`--help` knows about it too, so the requirement is visible before anyone
runs the command:

```sh
$ ./dist/index.js count --help
Usage: decopin-cli count [options]

Count lines coming from stdin.

Stdin:
  lines            required (pipe something in)
...
```

## env.tsx: which environment does this CLI need?

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

A bad value fails fast, before the command, and says which variable and why.
With `--json` the same failure is structured (`code: "env"`), so a script
calling the CLI can tell a setup problem from a runtime one:

```sh
$ DECOPIN_LOG=verbose ./dist/index.js config
Invalid usage: DECOPIN_LOG: Invalid type: Expected ("debug" | "info" | "warn" | "error") but received "verbose"
exit code 2
```

Reading `process.env` directly still works, of course. The point of the file
is that the list of what the CLI depends on exists, in one place, and that
the type checker enforces it: `env.DECOPIN_LGO` is a compile error.

## Where the types come from

`decopin build` and `decopin dev` write `.decopin/types.d.ts` from the files
above, and your `tsconfig.json` includes it. `CmdProps<'user/import'>` is the
command's path, and each prop on it traces back to one file:

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

`data.tsx` is inferred from its return type; `output.tsx` replaces the
inference with a declaration and checks the value at run time before it is
displayed or printed as `--json`. The same declarations feed `--help`, shell
completion, and the MCP tool schema, so there is one description of each
command and it is the one the compiler reads.

## Working examples

[`demo/app/`](demo/app/) is the example, and the build and the tests keep it honest.

| Command                                        | What it shows                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| [`demo/app/hello`](demo/app/hello)             | positional args, options, enums                                       |
| [`demo/app/count`](demo/app/count)             | `stdin.tsx` (lines), a `help.tsx` override, bundled boolean aliases   |
| [`demo/app/upper`](demo/app/upper)             | optional stdin (`undefined` in a terminal)                            |
| [`demo/app/config`](demo/app/config)           | reading validated `env.tsx` values                                    |
| [`demo/app/user`](demo/app/user)               | subcommands, `layout.tsx`, `middleware.tsx`, an inherited `error.tsx` |
| [`demo/app/user/import`](demo/app/user/import) | `mode="json"` with `Type.Object`                                      |
| [`demo/app/user/show`](demo/app/user/show)     | `notFound()` with an automatic suggestion, `complete.tsx`             |
| [`demo/app/deploy`](demo/app/deploy)           | `help()` when the input cannot be acted on                            |
| [`demo/app/publish`](demo/app/publish)         | `authRequired()` / `missingTool()` with fix hints                     |
| [`demo/app/stats`](demo/app/stats)             | `data.tsx` split from the view, `output.tsx`, and `--json`            |
| [`demo/app/crash`](demo/app/crash)             | `error.tsx` and `<Exit>`                                              |
| [`demo/app/go`](demo/app/go)                   | `shell.tsx`: `cd` and `export` in the parent shell                    |

## Documentation

Everything else is at **https://yuyakinjo.github.io/decopin-cli/**, one page
per file convention plus the guides: `data.tsx` and `--json`, inherited
`error.tsx` / `layout.tsx` / `middleware.tsx`, `shell.tsx` for changing the
parent shell, shell completion, exposing commands as MCP tools, Partial
Repainting, output components, startup cost, versioning and releasing.

The reasoning behind the design is in [docs/decisions.md](docs/decisions.md),
written in Japanese. The behaviour is pinned by table-driven tests in
[`test/contract/`](test/contract), and the examples in this README and in the
documentation are type-checked and executed by [`test/docs/`](test/docs), so
they cannot drift from the code.

## Development

```sh
bun run ci            # build, then typecheck / test / lint / format in parallel
bun run site          # build the documentation site into site/dist
bun run site:dev      # build and preview at http://localhost:4173 (restart after edits)
bun run bench         # startup time
bun run format        # rewrite files (ci only checks)
```

## Versioning

Versions are timestamps, not SemVer: `YYYY.MMdd.HHmm` in UTC. **This changes
what `^` and `~` mean for you**: `^2026.828.1430` allows anything below
`2027.0.0`. Pin the exact version if that matters to you. Nothing is removed
without a deprecation warning from `decopin build` and a year of grace; the
current list and the release process are in the
[documentation](https://yuyakinjo.github.io/decopin-cli/project/versioning/).

## License

MIT
