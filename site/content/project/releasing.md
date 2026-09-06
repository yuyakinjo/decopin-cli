---
title: Releasing
description: How a release is cut, and why the tag is a result rather than an input.
---

Releases are started by hand from the Actions tab
([`.github/workflows/release.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/release.yml));
the workflow picks the number, so the tag is a result rather than an input.
`dry-run` shows which version it would publish without publishing it.

npm auth goes through
[Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers), so there
is no `NPM_TOKEN`, and `--provenance` attaches provenance to the release.

`bun run build:package` assembles what gets published into `publish/`: JS and
`.d.ts` only, no sources.

## This site

The site is built by `bun run site` from the Markdown under `site/content/`
and deployed to GitHub Pages by the `pages` workflow on every push to `main`.
The generator is a single Bun script with no dependencies; Markdown is
rendered by `Bun.markdown`.
