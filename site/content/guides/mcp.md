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
