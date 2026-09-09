---
title: Scaffolding
description: Create a project with init and add convention files with gen.
---

Use `init` to create a project and `gen` to add individual files as your CLI
grows. Both keep existing files.

## Create a project

```sh
bunx decopin-cli init my-cli
cd my-cli
bun run build
./dist/index.js hello
```

`init` creates `package.json`, `tsconfig.json`, `.gitignore`, and a working
`app/hello/` command with `argv.tsx` and `cmd.tsx`. It then installs
`decopin-cli` and `@types/bun`. Omit the directory to use the current folder,
or pass `--no-install` to create the files without installing dependencies.
See [Setup](/getting-started/setup/) for the configuration details.

## Generate a command

Run these from your project directory:

```sh
bunx decopin-cli gen --conv cmd --path app/greet
bunx decopin-cli gen --conv argv --path app/greet
bun run build
./dist/index.js greet
```

The first command creates `app/greet/cmd.tsx`, which prints `Hello, world!`.
The second creates `app/greet/argv.tsx` with an empty argument declaration.
Edit these files to define your command's output, arguments, and options.

Each invocation creates one `.tsx` file and any missing directories. Generating
`argv`, `data`, or another supporting file does not also create `cmd.tsx`;
a directory becomes a command when it has `cmd.tsx`.

## Choose a file category

Choose exactly one category flag and a file name without an extension:

| Flag          | Supported names                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--conv`      | `cmd`, `argv`, `stdin`, `data`, `output`, `error`, `not-found`, `layout`, `middleware`, `help`, `shell`, `complete` |
| `--inherited` | `error`, `not-found`, `layout`, `middleware`                                                                        |
| `--root-only` | `global-error`, `not-found`, `env`, `version`                                                                       |

```sh
bunx decopin-cli gen --inherited layout --path app/user
bunx decopin-cli gen --inherited middleware --path app/user
bunx decopin-cli gen --root-only env --path app
bunx decopin-cli gen --root-only version --path app
```

Inherited files share their templates and names with the corresponding
convention files. Their location determines which subtree they apply to;
`app/user/layout.tsx` wraps the commands under `user`. A group does not need
its own `cmd.tsx` to hold inherited files.

`--root-only` requires the app root as its destination. `not-found` appears
in more than one category because it handles unknown commands at the root
and can also handle missing resources or subcommands in a subtree. See
[Project structure](/getting-started/project-structure/) for each file's role.

## Choose a destination

`--path` is a directory relative to the current working directory. It defaults
to the app root, which is `app` unless you set `--app`:

```sh
bunx decopin-cli gen --conv cmd --app src/app --path src/app/greet
bunx decopin-cli gen --root-only env --app src/app
bunx decopin-cli build --app src/app
```

The destination must be inside that root. Directories ignored by the router
(names starting with `_` or `.`, and `node_modules`) are rejected. Symbolic
links at the app root or between it and the destination are also rejected,
including links to directories inside the app.

## Existing files and next steps

`gen` reports `Wrote` for a new file and `Kept` when a file already exists.
It preserves both `.tsx` and `.ts` implementations, as well as legacy
`command.tsx` or `command.ts` when generating `cmd`. It does not overwrite them.

After editing your templates, run `bun run build` to update the generated
types and executable. For the full list of generator options, run:

```sh
bunx decopin-cli gen --help
```
