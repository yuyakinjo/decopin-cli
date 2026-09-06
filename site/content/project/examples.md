---
title: Working examples
description: The demo app in the repository, kept honest by the build and the tests.
---

[`demo/app/`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app) is
the example, and the build and the tests keep it honest. Every code block on
this site that starts with `// app/...` is a real file there, and the shell
output shown is what the demo prints.

| Command                                                                                  | What it shows                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`hello`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/hello)             | positional args, options, enums                                       |
| [`count`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/count)             | `stdin.tsx` (lines), a `help.tsx` override, bundled boolean aliases   |
| [`upper`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/upper)             | optional stdin (`undefined` in a terminal)                            |
| [`config`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/config)           | reading validated `env.tsx` values                                    |
| [`user`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/user)               | subcommands, `layout.tsx`, `middleware.tsx`, an inherited `error.tsx` |
| [`user import`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/user/import) | `mode="json"` with `Type.Object`                                      |
| [`user show`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/user/show)     | `notFound()` with an automatic suggestion, `complete.tsx`             |
| [`deploy`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/deploy)           | `help()` when the input cannot be acted on                            |
| [`publish`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/publish)         | `authRequired()` / `missingTool()` with fix hints                     |
| [`stats`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/stats)             | `data.tsx` split from the view, `output.tsx`, and `--json`            |
| [`crash`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/crash)             | `error.tsx` and `<Exit>`                                              |
| [`go`](https://github.com/yuyakinjo/decopin-cli/tree/main/demo/app/go)                   | `shell.tsx`: `cd` and `export` in the parent shell                    |

```sh
git clone https://github.com/yuyakinjo/decopin-cli
cd decopin-cli
bun install
bun run build            # builds demo/app into dist/index.js
./dist/index.js hello world
```
