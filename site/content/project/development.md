---
title: Development
description: Working on decopin-cli itself.
---

```sh
bun install
bun run ci            # build, then typecheck / test / lint / format in parallel
bun run site          # build the documentation site into site/dist
bun run bench         # startup time
bun run format        # rewrite files (ci only checks)
```

`bun run ci` runs exactly what CI runs
([`.github/workflows/ci.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/ci.yml)).

## Layout of the source

```
src/
├── cli/                  the decopin command: init, build, dev
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

| Directory        | What it pins                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `test/contract/` | promised behaviour, as tables                                       |
| `test/docs/`     | the README and this site: tsx blocks type-check, shell examples run |
| `test/renderer/` | the terminal renderer and display width                             |
| `test/features/` | each file convention on its own                                     |
