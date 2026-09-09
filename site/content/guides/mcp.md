---
title: MCP tools
description: Every command is already an MCP tool. Nothing new to declare.
---

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

| MCP field                 | Comes from                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `name`                    | the command path, `user/show` becomes `user_show`                                    |
| `description`             | `<Argv description>`                                                                 |
| `inputSchema`             | `argv.tsx` (plus a `stdin` argument if `stdin.tsx`)                                  |
| `outputSchema`            | `output.tsx`, whether you wrote `Type.*` or valibot                                  |
| `structuredContent`       | `data.tsx` output, wrapped in `{ result: ... }` when needed                          |
| `annotations`             | the build-time effects analysis, see below                                           |
| `_meta` `decopin-cli/env` | the `<Var>` list in `env.tsx`, so a host can read what a call needs before making it |

A valibot schema is walked the same way `Type.*` is, and a part of it that
JSON Schema cannot express becomes `{}` — unconstrained, rather than a
constraint that is not really there. The real gate is still the run-time
check in `output.tsx`.

A call runs the command through the same path as the terminal does:
arguments are validated against `argv.tsx`, middleware runs, `output.tsx`
checks the data, and a failure comes back as `isError: true` with the same
structured payload `--json` prints (`{"error": {"code": "validation", ...}}`),
so the model can read what to fix.

To add another tool, [scaffold a command](/guides/scaffold/) with `gen`,
edit its declarations and implementation, and rebuild the CLI. It becomes
available through the same `__mcp` entry point.

## What is not exposed

A command with [`shell.tsx`](/conventions/shell/) is left out of `tools/list`,
and calling it by name is refused. Its point is to change the parent shell,
and under an MCP host there is no parent shell to change: listing it would let
a model call it, read a successful reply, and never get the `cd`. Half an
effect, silently, is worse than no tool.

A command that uses [`choose()`](/guides/prompts/) stays listed. Outside a
terminal it exits 2 with a message naming the argument to pass instead, so the
failure comes back structured and the model can fix the call. Only what would
fail silently is hidden.

## Annotations come from analysis, not assertion

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

## --strict-effects

To turn the analysis into a guarantee, build with `--strict-effects`: any
command the analysis had to give up on (`eval`, `new Function`, an import
Bun cannot resolve) fails the build, with the chain that led there. A
command that genuinely needs one of those can opt out by exporting
`unsafeEval = true` from its `cmd.tsx`, the same way `skipLayout` works.
It still builds, its verdicts stay `unknown`, and it gets no hints. There is
no way to declare effects by hand: the point is that nobody has to.

The server has no dependencies: it is a few hundred lines of newline-delimited
JSON-RPC, because that is all stdio MCP needs.

## Output and input compatibility

Object output schemas keep their original shape. Other output schemas (including
unions and schemas whose output shape cannot be determined) are exported as an
object with a required `result` property; both structured content and its text
representation use that wrapper. Without an output declaration, only non-object
results are wrapped. The terminal's `--json` output stays unchanged.

JSON stdin accepts JSON values directly, including strings and `null`. Valibot
stdin declarations export their input structure; fields with defaults can be
omitted. Nullable output fields retain `null` in their exported schema. Regular
expressions with flags are omitted because JSON Schema cannot preserve those
flags; runtime validation still applies.

Tool names must be unique after normalization and truncation. A collision, such
as `user/show` and `user_show`, fails the build with both route names. The MCP
server also refuses listing and calls when a manually supplied route table has
a collision.
