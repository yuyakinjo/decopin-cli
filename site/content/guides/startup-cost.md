---
title: Startup cost
description: The number that matters when a CLI replaces a shell alias.
---

The point of this framework is replacing shell aliases, so startup is the
number that matters. Measured with
[hyperfine](https://github.com/sharkdp/hyperfine) on macOS (arm64, Bun 1.4.0),
100 warm runs of `hello world`, a command that parses argv, validates it
against `argv.tsx`, and renders JSX:

| What                                      | Mean startup | Size   |
| ----------------------------------------- | ------------ | ------ |
| `zsh -c "echo hello"` (floor)             | 1.9 ms       | —      |
| empty compiled Bun binary (runtime floor) | 4.7 ms       | 57 MB  |
| `bun dist/index.js`                       | 14.3 ms      | 141 KB |
| `bun build --compile`                     | 13.8 ms      | 57 MB  |
| `bun build --compile --bytecode`          | **11.0 ms**  | 58 MB  |

Two things fall out of the empty-binary row. The ~57 MB is the Bun runtime,
not your commands; the framework and a seven-command app add about 1 MB on
top. And of the 11 ms, roughly 4.7 ms is Bun starting at all, so decopin's own
share is around 6 ms.

`--bytecode` is worth taking: it costs 1 MB and removes a fifth of the startup
time. It refuses any module with a top-level await, so the generated entry
avoids one.

Compiling barely beats running the bundle (13.8 ms vs 14.3 ms). Compile for
distribution, one file, no Bun required on the target machine, not for speed.

Reproduce with `bun run bench` for a per-command breakdown. The numbers are
also tracked over time by the `bench` workflow in the repository.
