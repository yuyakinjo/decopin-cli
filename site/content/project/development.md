---
title: Development
description: Working on decopin-cli itself.
---

```sh
bun install
bun run ci            # build, then typecheck / test / lint / format in parallel
bun run build         # build demo/app with the checkout itself (no bunx)
bun run dev           # watch demo/app and rebuild on every save
bun run gen --conv cmd --path demo/app/hello   # scaffold into demo/app
bun run site          # build the documentation site into site/dist
bun run site:dev      # build and preview at http://localhost:4173 (restart after edits)
bun run bench         # startup time
bun run format        # rewrite files (ci only checks)
```

`bun run ci` runs exactly what CI runs
([`.github/workflows/ci.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/ci.yml)).

## Layout of the source

```
src/
├── cli/                  the decopin command: init, gen, build, dev
├── core/
│   ├── build/            scanner, evaluator, type emitter, codegen
│   ├── runtime/          what runs inside your built CLI
│   ├── jsx/ renderer/    the JSX runtime and the terminal renderer
│   ├── components/       Line, Text, Box, Table, ...
│   └── validation/       the Type.* components and their valibot mapping
└── features/
    ├── conventions/      cmd, argv, data, output, stdin, help, shell, complete
    ├── inherited/        layout, middleware, error, not-found
    └── root-only/        env, version, global-error, not-found
```

The three directories under `features/` are the same three kinds of files
this site is organised by. Each feature owns its file name, its build-time
evaluation, its runtime, and its contribution to the generated types.

## Tests

Unit tests mirror `src/`: the tests for `src/core/renderer/` live in
`test/core/renderer/`, and every source directory has at least one test file
next to its twin. `bun run check:layout` enforces this, and CI runs it.

| Directory                                   | What it pins                                                        |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `test/cli/`, `test/core/`, `test/features/` | each source directory on its own, mirroring `src/`                  |
| `test/contract/`                            | promised behaviour, as tables                                       |
| `test/docs/`                                | the README and this site: tsx blocks type-check, shell examples run |
| `test/integration/`                         | each subcommand end to end, the way a user runs it                  |

## Starting a new subcommand

Before writing `src/cli/<name>/`, write two things down (in the issue or the
ADR, not in code):

1. **Its purpose in one sentence**: what someone can do that they could not
   before. If the sentence will not come, the design is not settled yet.
   This step is where `decopin docs` dropped its "click to run" HTML and
   became "know the result without running it" (ADR 45).
2. **The outcomes a user can observe**, each one a place you would go to fix
   a failure. Leave the output format out of them; that is what changes while
   implementing.

Each outcome then becomes a test in `test/integration/<name>.test.ts`.
