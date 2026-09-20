---
title: Development
description: Working on decopin-cli itself.
---

```sh
bun install
bun run ci            # build, then typecheck / test / lint / format in parallel, then the Intent document
bun run build         # build demo/app with the checkout itself (no bunx)
bun run intent:doc    # rerun every test, then print which Behavior each Intent proves and where
bun run intent:list   # the index alone: one line per Intent, with its purpose
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

| Directory        | What it pins                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `test/contract/` | promised behaviour, as tables                                       |
| `test/docs/`     | the README and this site: tsx blocks type-check, shell examples run |
| `test/renderer/` | the terminal renderer and display width                             |
| `test/features/` | each file convention on its own                                     |
| `test/intent/`   | the Intents, and the runtime that turns tests into their Evidence   |

## Intents

Every subcommand states what it is for, as an Intent (ADR 48). A test that
shows a user reaching one of those outcomes is that Intent's **Evidence** —
it is not a separate kind of test, it is the same test, named after the
outcome and registered against a Behavior.

Start from the index, not from the source:

```sh
bun run intent:list                          # 8 Intents, one purpose each
bun test/intent/doc.ts run-commands-as-declared   # one Intent in full
```

The purpose lines carry the words a user would use ("打ち間違えた", "型が
遅れない"), so grepping the index finds the Intent before you know which
file implements it.

### Adding one

A new subcommand under `src/cli/<name>/` starts from its Intent, and
`test/docs/decisions.test.ts` fails until it has one. Four files in
`test/intent/<name>/`:

| File                | Holds                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| `intent.ts`         | one sentence: what someone can do that they could not before            |
| `behavior.ts`       | the outcomes, each one a place you would go to fix a failure            |
| `implementation.ts` | Behavior → the functions that carry it (implementation stays in `src/`) |
| `<name>.test.ts`    | the Evidence, ending in `report(IMPLEMENTATION)`                        |

```ts
// <name>.test.ts — the shape. proves() only counts a test that passed.
describeBehavior(IMPLEMENTATION, 'tells-the-next-step', () => {
  proves('書いたファイルと次に打つコマンドを出す', async () => {
    /* ... */
  });
});

report(IMPLEMENTATION); // last line, once. The runtime throws if anything follows.
```

An outcome you cannot prove is declared, not omitted: `waived(id, description,
why)` keeps it in the document with its reason, and fails once it _can_ be
proved.

### Proving one Intent from several files

A test that already lives next to its convention stays there. Wrap it and
declare the split — no file moves:

```ts
// test/runtime/handle-error.test.tsx
describeBehavior(RUNTIME, 'handles-errors-where-declared', () => {
  /* proves(...) */
});
report(RUNTIME, { partial: true });
```

Every file proving that Intent passes `partial`, including the one in
`test/intent/`; whether all Behaviors were reached is then decided after
`doc.ts` merges the shards. Two rules the runtime enforces: `describe` does
not nest inside `describeBehavior` (fold the heading into the proof name),
and `report()` is the last line.

`bun test` writes the shards, `bun run ci` reads them. A filtered run leaves
stale shards behind, so rebuild the document with `bun run intent:doc`, which
clears them and runs everything.
