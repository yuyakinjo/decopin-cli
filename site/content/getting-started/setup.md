---
title: Setup
description: Create a project, or add decopin-cli to an existing one.
---

```sh
bunx decopin-cli init my-cli   # or `init` alone for the current folder
cd my-cli
bun run build
./dist/index.js hello          # hello, world
```

To add commands and other convention files after setup, use
[`gen`](/guides/scaffold/).

```sh
bunx decopin-cli gen --conv cmd --path app/greet
```

## By hand

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

`.decopin/types.d.ts` is where the generated types land. Keep it in
`include`, and keep `.decopin/` out of version control.

## Build and watch

```sh
bunx decopin build   # scan app/ and produce dist/index.js
bunx decopin dev     # watch app/ and rebuild types + dist/index.js on every save
```

`decopin dev` also fills in the `CmdProps<'…'>` annotation when it sees a
`cmd.tsx` without one, so a new command is typed as soon as the file is saved.

The same pass annotates declaration files with their return type —
`ArgvDefinition`, `StdinDefinition`, `OutputDefinition`, `ShellDefinition`,
`EnvDefinition`, `VersionDefinition`, and `DataResult<'…'>` for a `data.tsx`
whose command declares an `output.tsx`:

```tsx
// app/env.tsx, after a save
import { Env, Var, type EnvDefinition } from 'decopin-cli';

export default function DefineEnv(): EnvDefinition {
  return (
    <Env>
      <Var name="API_TOKEN" type="string" />
    </Env>
  );
}
```

Files that already carry a return type are left untouched, byte for byte.
The JSX ones say that the file returns an element and nothing more — a JSX
expression cannot carry a type argument, so the shape inside is checked when
the CLI builds, not while you type. `DataResult` is the exception: it does
not go through JSX, so a `data.tsx` that disagrees with its `output.tsx`
fails to type-check. See [data.tsx and output.tsx](/conventions/data/).

## Distributing

`bun build --compile` turns `dist/index.js` into a single binary that does not
need Bun on the target machine. `--bytecode` on top removes about a fifth of
the startup time; see [Startup cost](/guides/startup-cost/).
