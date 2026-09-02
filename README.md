# decopin-cli

Build CLIs the way Next.js builds web apps: file conventions, JSX output, and
types that come from your declarations. TypeScript + Bun.

The four channels of a shell map one-to-one onto file names.

| File          | What it is in the shell | Required |
| ------------- | ----------------------- | -------- |
| `command.tsx` | stdout (fd 1)           | yes      |
| `argv.tsx`    | command line arguments  | no       |
| `stdin.tsx`   | standard input (fd 0)   | no       |
| `error.tsx`   | stderr (fd 2)           | no       |

Output is JSX. There is no React — decopin ships its own small renderer.

```tsx
// app/hello/command.tsx
import { Line, Text, type CommandProps } from 'decopin-cli';

export default function Command({ args, options }: CommandProps<'hello'>) {
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

**Bun is required.** The library calls `Bun.build` / `Bun.stdin`, and the CLI it
generates runs under `#!/usr/bin/env bun`. It does not run on Node.

```sh
bun add decopin-cli
```

Your `tsconfig.json` needs the JSX settings. **Without them TypeScript and Bun
both look for React** and the build fails with a confusing error (`decopin build`
warns you about this).

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "decopin-cli/jsx",
    "allowImportingTsExtensions": true
  },
  "include": ["app/**/*", ".decopin/types.d.ts"]
}
```

```sh
bunx decopin build   # scan app/ and produce dist/index.js
bunx decopin dev     # watch app/ and keep the types fresh (no bundling)
```

## Declaring arguments

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

**Type and presence live at different levels.**

| What it decides              | Where it goes                                          |
| ---------------------------- | ------------------------------------------------------ |
| the type and its constraints | children (`Type.*`) or the `type` shorthand            |
| whether it can be omitted    | props on `<Arg>` / `<Option>` (`required` / `default`) |

`required` and `default` cannot both be set (with neither, the value is optional).

The declaration is where your types come from.

```tsx
import type { CommandProps } from 'decopin-cli';

export default function Command({ args, options }: CommandProps<'hello'>) {
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

## Separating data from the view

A command can split in two: `data.tsx` computes, `command.tsx` displays. The
return value of `data.tsx` arrives as the `data` prop, fully typed — no
annotation needed, because the generated types read it back through
TypeScript's own inference.

```tsx
// app/stats/data.tsx
import type { CommandProps } from 'decopin-cli';

export default function Data({ options }: CommandProps<'stats'>) {
  const files = ['README.md', 'package.json'];
  return { files, total: files.length };
}
```

```tsx
// app/stats/command.tsx
import { KeyValue, List, type CommandProps } from 'decopin-cli';

export default function Command({ data }: CommandProps<'stats'>) {
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

### Declaring the shape

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

`--json` refuses to print data that would not survive the round trip, and
names the path rather than letting it break quietly:

```sh
$ ./dist/index.js stats --json
data.lookup cannot go into --json: Map becomes {} in JSON
```

`JSON.stringify` drops functions and `undefined`, turns `Map` and `Set` into
`{}`, and turns `NaN` into `null` — all without complaining. `Date` and
`Temporal` values become strings that the declared type never mentions. Export
plain data, or convert at the edge (`when: when.toISOString()`). The `JsonValue`
type is exported if you would rather assert it yourself with `satisfies`.

When a command fails under `--json`, the failure is structured too — on
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
the view is. `code` is what a caller should branch on — messages get reworded,
categories do not. `exitCode` is repeated in the body because a caller reading
through a pipe cannot see `$?` (in `cmd | jq`, that belongs to jq).

Piping does **not** switch to JSON on its own. Dropping colour when stdout is
not a terminal adjusts presentation; changing the output _format_ would break
`cli stats | grep README`, so it happens only when asked. A command without a
`data.tsx` exits 2 on `--json` and tells you where to put the file.

## Reading stdin

**A command without `stdin.tsx` never touches stdin.** The most common CLI
accident — running a command in a terminal and having it hang on input you did
not know it wanted — cannot happen by construction.

```tsx
// app/count/stdin.tsx
import { Stdin } from 'decopin-cli';

export default function DefineStdin() {
  return <Stdin mode="lines" required />;
}
```

| `mode`  | What the command receives                                     |
| ------- | ------------------------------------------------------------- |
| `text`  | `string` (the whole input). `trim` drops the trailing newline |
| `lines` | `string[]` (split on newlines)                                |
| `json`  | the type you declared in children, otherwise `unknown`        |

Without `required`, a command run in a terminal receives `undefined` (and the
type says `| undefined`).

```sh
$ printf 'a\nb\n\nc\n' | ./dist/index.js count
4
```

## When something is not there

`notFound()` can be called from anywhere in a command. It renders the nearest
`not-found.tsx` and picks the exit code, and if you hand it the valid values it
works out the suggestion for you:

```tsx
// app/user/show/data.tsx
import { notFound, type CommandProps } from 'decopin-cli';

const USERS = ['alice', 'bob', 'carol'];

export default function Data({ args }: CommandProps<'user/show'>) {
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
a subcommand can have its own wording. One view serves both cases — an unknown
command and a `notFound()` call — and tells them apart with `what`. Under
`--json` the failure is structured with `code: "not-found"`.

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

## When the input cannot be acted on

`help()` shows this command's usage and stops. It builds the same thing
`--help` does — including a `help.tsx` override — but since it was not asked
for, it goes to stderr with exit 2, matching how the framework already treats
misuse.

```tsx
// app/deploy/command.tsx
import { help, Success, type CommandProps } from 'decopin-cli';

export default function Command({ args, options }: CommandProps<'deploy'>) {
  if (args.target === undefined && !options.all) {
    help({ message: 'give a target, or pass --all' });
  }
  return (
    <Success>deploying {options.all ? 'everything' : args.target}</Success>
  );
}
```

```sh
$ ./dist/index.js deploy          # exit 2, all of it on stderr
✖ give a target, or pass --all
Usage: decopin-cli deploy [target] [options]

Deploy a target, or everything with --all.
...
```

## When the environment is not ready

Two shapes every CLI ends up needing, both saying what is missing **and the
command that fixes it**:

```tsx
// app/publish/data.tsx
import { authRequired, missingTool, type CommandProps } from 'decopin-cli';

export default function Data({ env }: CommandProps<'publish'>) {
  if (env.DECOPIN_TOKEN === undefined) {
    authRequired({ service: 'the registry', fix: 'export DECOPIN_TOKEN=…' });
  }
  if (Bun.which('cosign') === null) {
    missingTool({
      tool: 'cosign',
      reason: 'to sign the package',
      install: 'brew install cosign',
    });
  }
  return { published: true };
}
```

```sh
$ ./dist/index.js publish
Setup needed: Not authenticated to the registry
  export DECOPIN_TOKEN=…
```

These are ordinary errors, so they travel the `error.tsx` path and can be
branched on with `error.kind` (`'auth'` / `'missing-tool'`). The fix lines live
on `error.hints`, and they reach `--json` as well:

```json
{
  "error": {
    "code": "auth",
    "message": "Not authenticated to the registry",
    "exitCode": 1,
    "hints": ["export DECOPIN_TOKEN=…"]
  }
}
```

That last part is the point. A person reading `gh auth login` knows what to do
next; an agent needs the same thing in a field it can read, which is why hints
are not only formatting.

## Reporting errors

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

| Code | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| 0    | success                                                               |
| 1    | runtime error (a throw inside `command.tsx`)                          |
| 2    | usage error (validation, unknown command, missing env, missing stdin) |
| 130  | Ctrl+C                                                                |

## The other conventions

| File             | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `layout.tsx`     | wraps the output. Inherited from parent directories              |
| `middleware.tsx` | wraps the execution. Nothing inside runs until you call `next()` |
| `help.tsx`       | overrides `--help`. Per directory                                |
| `not-found.tsx`  | the view for an unknown command                                  |
| `env.tsx`        | declares environment variables, validated once at startup        |
| `version.tsx`    | what `--version` prints                                          |

```tsx
// app/user/middleware.tsx — next is a function, so nothing runs until you call it
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

Directories starting with `_` never become commands (put shared code there).

## Subcommands

The directory tree is the subcommand tree. A directory without a `command.tsx`
is a group, and it lists what is under it.

```
app/user/list/command.tsx     → cli user list
app/user/import/command.tsx   → cli user import
```

```sh
$ ./dist/index.js user
Usage: decopin-cli user <command> [options]

Commands:
  import
  list

Run "decopin-cli user <command> --help" for details.
```

Asking for `--help` explicitly prints to stdout and exits 0. Ending up without a
command prints to stderr and exits 2.

## Output components

```tsx
<Line>one line (a newline is appended)</Line>
<Text bold dim italic underline color="green" bg="#333">
  decorated
</Text>
<Br />
<Stdout>
  <Line>this goes to stdout</Line>
</Stdout>
<Stderr>
  <Line>this goes to stderr</Line>
</Stderr>
<Exit code={2} />
```

```tsx
<Indent by={2}>
  <Line>indented</Line>
</Indent>
<Box border="round" title="summary">
  <Line>framed</Line>
</Box>
<Columns gap={4}>
  <Line>left column</Line>
  <Line>right column</Line>
</Columns>
<Success>ok</Success>
<Warn>careful</Warn>
<Info>fyi</Info>
<Danger>failed</Danger>
<List items={['a', 'b']} ordered />
<Table
  columns={['NAME', 'SCORE']}
  rows={[['alice', 42]]}
  align={['left', 'right']}
/>
<KeyValue data={{ version: '0.1.0', routes: 6 }} />
<Json value={{ ok: true }} />
<Line>
  <Link href="https://example.com">docs</Link>
</Line>
```

Display width is counted properly, so frames and tables do not drift when the
content is CJK or emoji.

```
╭─ summary ──────────────────────╮
│ decopin-cli v0.1.0             │
│ 日本語も桁がずれない           │
╰────────────────────────────────╯
```

Color turns itself off when it should: piped or redirected output, `NO_COLOR`,
`--no-color`, or `TERM=dumb` (`FORCE_COLOR` forces it back on). `<Line>` never
wraps on its own, so line-oriented consumers downstream keep working.

## Dynamic regions

Output is static by default. When part of it should update over time — a
progress display, a step counter — opt in with `<Dynamic>`. Time is passed
as a stream of values: hand it an async generator, and render a frame from
the latest value.

```tsx
import { Dynamic, Line, ProgressBar, Spinner } from 'decopin-cli';

interface Progress {
  step: string;
  done: number;
}

async function* deploySteps(): AsyncGenerator<Progress> {
  yield { step: 'building', done: 0 };
  // ...do the work between yields...
  yield { step: 'pushing', done: 1 };
  yield { step: 'released', done: 2 };
}

export default function Command() {
  return (
    <>
      <Line>deploy started</Line>
      <Dynamic source={deploySteps()} interval={100}>
        {(progress) => (
          <Line>
            <Spinner /> <ProgressBar value={progress.done} max={2} width={16} />{' '}
            {progress.step}
          </Line>
        )}
      </Dynamic>
      <Line>all done</Line>
    </>
  );
}
```

The document streams top to bottom: static parts flush as soon as they are
reached, the `<Dynamic>` region repaints in place until its source is
exhausted, then the last frame stays put and the rest of the document
follows. `interval` (ms) repaints even without a new value, for frames that
read the clock.

The region lives on **stderr**, following the Unix convention for progress
decoration (like curl and cargo), so `cli deploy | tee log` stays clean:
stdout carries only the static document. When stderr is not a TTY (pipes,
CI), intermediate frames are skipped entirely and only the final frame is
written once.

`<Dynamic>` must sit at the top level of the command output — not inside
`<Line>`, `<Box>`, `<Columns>`, or `<Indent>`.

`<Spinner>` and `<ProgressBar>` are ordinary inline components, so compose
them inside a `<Line>` with anything else. The spinner advances on each
repaint rather than reading the clock, which keeps frames a pure function of
their input: the same input always renders the same output, and animation
falls out of the repaint loop (pair it with `interval`). In static output a
spinner simply shows its first frame. Both fall back to ASCII (`|/-\\`, `#-`)
when the terminal is not UTF-8.

## Reserved options

`--help`, `-h`, `--version` and `--no-color` are handled by the framework.
Declaring any of them in `argv.tsx` is a build error.

## Shell completion

`bun run build` also writes a zsh completion shim to
`dist/completions/_<bin>`. Put it on your `$fpath` (before `compinit` runs)
and Tab completion works for subcommands, option names, and `Type.Enum`
values:

```sh
mkdir -p ~/.zsh/completions
cp dist/completions/_mycli ~/.zsh/completions/
# in .zshrc, before compinit:
#   fpath=(~/.zsh/completions $fpath)
```

The shim is thin on purpose: on every Tab it asks the CLI itself
(`mycli __complete`) for candidates, so the file never changes when you
add or remove commands — rebuilding the CLI is enough, and zsh's
completion cache never goes stale. `__complete` is reserved by the
framework and hidden from help. When there are no candidates, completion
falls back to filenames.

## Exposing commands as MCP tools

Every command is already an MCP tool. Run the built CLI with the reserved
`__mcp` command and it speaks the Model Context Protocol over stdio, so an
agent host (Claude Code, Claude Desktop, MCP Inspector) can list and call
your commands:

```json
{
  "mcpServers": {
    "mycli": { "command": "mycli", "args": ["__mcp"] }
  }
}
```

Nothing new to declare. The tool definition is derived from what you already
wrote:

| MCP field           | Comes from                                          |
| ------------------- | --------------------------------------------------- |
| `name`              | the command path, `user/show` becomes `user_show`   |
| `description`       | `<Argv description>`                                |
| `inputSchema`       | `argv.tsx` (plus a `stdin` argument if `stdin.tsx`) |
| `outputSchema`      | `output.tsx`                                        |
| `structuredContent` | what `data.tsx` returns, the same as `--json`       |
| `annotations`       | the build-time effects analysis, see below          |

A call runs the command through the same path as the terminal does:
arguments are validated against `argv.tsx`, middleware runs, `output.tsx`
checks the data, and a failure comes back as `isError: true` with the same
structured payload `--json` prints (`{"error": {"code": "validation", ...}}`),
so the model can read what to fix.

Annotations are not something you assert. `decopin build` counts which side
effects each command can reach (file writes, network, spawning, mutating the
process) and the server turns a proven absence into a hint: `readOnlyHint`
and `destructiveHint: false` only when writes, spawning, process mutation
and network are all unreachable; `openWorldHint: false` only when network and
spawning are. If the analysis had to give up on a command (`eval`, an import
it could not resolve), no hints are sent and the host falls back to the
protocol's conservative defaults. A hint is still a hint, not a sandbox.
The raw verdicts ride along in each tool's `_meta` under `decopin-cli/effects`,
so a host that wants its own policy can read `none` / `detected` / `unknown`
per category instead of trusting the hints.

When a command does reach something, `decopin build` shows the import chain
that gets there, so you know what to change:

```
Effects reachable (? = analysis gave up):
  publish: fs.read
    fs.read: app/publish/data.tsx -> Bun.which
```

To turn the analysis into a guarantee, build with `--strict-effects`: any
command the analysis had to give up on (`eval`, `new Function`, an import
Bun cannot resolve) fails the build, with the chain that led there. A
command that genuinely needs one of those can opt out by exporting
`unsafeEval = true` from its `command.tsx`, the same way `skipLayout` works.
It still builds, its verdicts stay `unknown`, and it gets no hints. There is
no way to declare effects by hand: the point is that nobody has to.

The server has no dependencies: it is a few hundred lines of newline-delimited
JSON-RPC, because that is all stdio MCP needs.

## Working examples

[`app/`](app/) is the example, and the build and the tests keep it honest.

| Command                              | What it shows                                                         |
| ------------------------------------ | --------------------------------------------------------------------- |
| [`app/hello`](app/hello)             | positional args, options, enums                                       |
| [`app/count`](app/count)             | `stdin.tsx` (lines), a `help.tsx` override, bundled boolean aliases   |
| [`app/upper`](app/upper)             | optional stdin (`undefined` in a terminal)                            |
| [`app/user`](app/user)               | subcommands, `layout.tsx`, `middleware.tsx`, an inherited `error.tsx` |
| [`app/user/import`](app/user/import) | `mode="json"` with `Type.Object`                                      |
| [`app/config`](app/config)           | reading validated `env.tsx` values                                    |
| [`app/user/show`](app/user/show)     | `notFound()` with an automatic suggestion                             |
| [`app/deploy`](app/deploy)           | `help()` when the input cannot be acted on                            |
| [`app/publish`](app/publish)         | `authRequired()` / `missingTool()` with fix hints                     |
| [`app/stats`](app/stats)             | `data.tsx` split from the view, and `--json`                          |
| [`app/crash`](app/crash)             | `error.tsx` and `<Exit>`                                              |

## Startup cost

The point of this framework is replacing shell aliases, so startup is the
number that matters. Measured with
[hyperfine](https://github.com/sharkdp/hyperfine) on macOS (arm64, Bun 1.4.0),
100 warm runs of `hello world` — a command that parses argv, validates it
against `argv.tsx`, and renders JSX:

| What                                      | Mean startup | Size   |
| ----------------------------------------- | ------------ | ------ |
| `zsh -c "echo hello"` (floor)             | 1.9 ms       | —      |
| empty compiled Bun binary (runtime floor) | 4.7 ms       | 57 MB  |
| `bun dist/index.js`                       | 14.3 ms      | 141 KB |
| `bun build --compile`                     | 13.8 ms      | 57 MB  |
| `bun build --compile --bytecode`          | **11.0 ms**  | 58 MB  |

Two things fall out of the empty-binary row. The ~57 MB is the Bun runtime,
not your commands — the framework and a seven-command app add about 1 MB on
top. And of the 11 ms, roughly 4.7 ms is Bun starting at all, so decopin's own
share is around 6 ms.

`--bytecode` is worth taking: it costs 1 MB and removes a fifth of the startup
time. It refuses any module with a top-level await, so the generated entry
avoids one — see [`src/build/codegen.ts`](src/build/codegen.ts).

Compiling barely beats running the bundle (13.8 ms vs 14.3 ms). Compile for
distribution — one file, no Bun required on the target machine — not for speed.

Reproduce with `bun run bench` for a per-command breakdown.

## Why it is built this way

The reasoning lives in [docs/decisions.md](docs/decisions.md) — why not Ink, why
types are generated at build time, why middleware takes `next` instead of
`children`, and so on. It is written in Japanese, as are the code comments.

The behaviour itself is pinned by table-driven tests in
[`test/contract/`](test/contract). There is no spec document: a document nobody
executes drifts away from the code.

Whether those decisions still hold is checked by
[`test/docs/decisions.test.ts`](test/docs/decisions.test.ts) (every ADR carries a
lint / test / manual guard, and adding an ADR fails the suite until you choose
one). Dangling references are caught by
[`test/docs/references.test.ts`](test/docs/references.test.ts).

## Development

```sh
bun run ci            # build, then typecheck / test / lint / format in parallel
bun run bench         # startup time
bun run format        # rewrite files (ci only checks)
```

`bun run ci` runs exactly what CI runs
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Versioning

Versions are timestamps, not SemVer: `YYYY.MMdd.HHmm` in UTC. `2026.828.1430`
was published on 2026-08-28 at 14:30 UTC.

**This changes what `^` and `~` mean for you.** `^2026.828.1430` allows anything
below `2027.0.0`, and `~2026.828.1430` allows anything later that same day. Pin
the exact version if that matters to you.

```jsonc
"decopin-cli": "2026.828.1430"   // exactly this one
```

### Breaking changes

A version number is a date, so it cannot tell you whether an upgrade is safe.
Instead:

- nothing is removed without warning. It is deprecated first, keeps working,
  and is removed **one year later**
- `decopin build` warns when your code uses something deprecated, and tells you
  what to use instead and by when
- every GitHub Release lists breaking changes and pending removals at the top

## Releasing

Releases are started by hand from the Actions tab
([`.github/workflows/release.yml`](.github/workflows/release.yml)); the workflow
picks the number, so the tag is a result rather than an input. `dry-run` shows
which version it would publish without publishing it.

npm auth goes through
[Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers), so there
is no `NPM_TOKEN`, and `--provenance` attaches provenance to the release.

`bun run build:package` assembles what gets published into `publish/` — JS and
`.d.ts` only, no sources.

## License

MIT
