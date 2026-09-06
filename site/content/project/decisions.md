---
title: Why it is built this way
description: Where the reasoning lives, and how it is kept from drifting.
---

The reasoning lives in
[docs/decisions.md](https://github.com/yuyakinjo/decopin-cli/blob/main/docs/decisions.md):
why not Ink, why types are generated at build time, why middleware takes
`next` instead of `children`, and so on. It is written in Japanese, as are the
code comments. Everything that leaves the repository (CLI output, generated
files, this site, the README) is in English.

## No spec document

The behaviour itself is pinned by table-driven tests in
[`test/contract/`](https://github.com/yuyakinjo/decopin-cli/tree/main/test/contract).
There is no spec document: a document nobody executes drifts away from the
code. An earlier 1,266-line spec accumulated nine features that were
described but never implemented, which is where the rule comes from.

| What               | Where it lives                         | Why it does not rot                                        |
| ------------------ | -------------------------------------- | ---------------------------------------------------------- |
| promised behaviour | table-driven tests in `test/contract/` | they run                                                   |
| how to use it      | the README and this site               | the examples are type-checked and executed by `test/docs/` |
| decisions and why  | `docs/decisions.md`                    | facts at the time of deciding                              |
| per-API reasons    | JSDoc on the public symbols            | next to the implementation                                 |

## Decisions are guarded

Whether those decisions still hold is checked by
[`test/docs/decisions.test.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/test/docs/decisions.test.ts):
every ADR carries a lint, test, or manual guard, and adding an ADR fails the
suite until you choose one. Dangling references are caught by
[`test/docs/references.test.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/test/docs/references.test.ts).
