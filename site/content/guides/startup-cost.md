---
title: Startup cost
description: The number that matters when a CLI replaces a shell alias.
---

The point of this framework is replacing shell aliases, so startup is the
number that matters. Measured with
[hyperfine](https://github.com/sharkdp/hyperfine) on macOS (arm64, Homebrew Bun
1.4.2), using the 12-command `demo/app` at commit `e35f0e0` on September 7, 2026.
Like the CI benchmark, each command uses `--shell=none --warmup 20 --runs 50`
and `NO_COLOR=1`. `hello world` parses argv, validates it against `argv.tsx`,
and renders JSX:

| What                                      | Mean ± stddev | Size      |
| ----------------------------------------- | ------------- | --------- |
| `zsh -c "echo hello"` (floor)             | 7.8 ± 0.9 ms  | —         |
| empty compiled Bun binary (runtime floor) | 9.8 ± 3.7 ms  | 62.23 MB  |
| `bun dist/index.js` (unminified)          | 20.1 ± 0.7 ms | 204.40 KB |
| `bun build --compile`                     | 22.2 ± 1.3 ms | 62.41 MB  |
| `bun build --compile --bytecode`          | 19.0 ± 1.1 ms | 62.84 MB  |

Sizes use decimal KB/MB. The runtime-floor sample had statistical outliers;
these local results are a snapshot, not a performance guarantee or a controlled
comparison with the older seven-command measurements in
[issue #52](https://github.com/yuyakinjo/decopin-cli/issues/52).
Subtracting the noisy floor gives an approximate framework/app share of 9.2 ms.

The runtime accounts for 62.23 MB; this app with bytecode adds about 0.61 MB.
Bytecode itself adds 0.43 MB over the compiled app without bytecode and saves
about 3.2 ms in this run. It refuses any module with a top-level await, so the
generated entry avoids one — see
[`src/core/build/codegen.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/src/core/build/codegen.ts).

`--bytecode-depth=1` measured 19.5 ± 1.8 ms at 62.69 MB: only 0.15 MB smaller,
with no demonstrated startup benefit. We keep the default depth. Compiling
provides one file with no Bun installation required on the target machine.

To reproduce the app measurements:

```sh
bun run build
bun build --compile .decopin/entry.ts --outfile /tmp/decopin-compiled
bun build --compile --bytecode .decopin/entry.ts --outfile /tmp/decopin-bytecode
NO_COLOR=1 hyperfine --shell=none --warmup 20 --runs 50 \
  'bun dist/index.js hello world' \
  '/tmp/decopin-compiled hello world' \
  '/tmp/decopin-bytecode hello world'
```

The empty-binary floor uses `process.exit(0);` compiled with `--compile --bytecode`.
`bun run bench` provides a separate per-command breakdown; CI measures compiled
startup and the runtime floor, plus the minified `hello-app` bundle size.
