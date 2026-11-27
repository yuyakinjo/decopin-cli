import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'リリース',
  description: 'リリースの切り方と、タグが入力ではなく結果である理由。',
  blocks: {
    'Releases are started by hand from the Actions tab ([`.github/workflows/release.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/release.yml)); the workflow picks the number, so the tag is a result rather than an input. `dry-run` shows which version it would publish without publishing it.':
      'リリースは Actions タブから手動で始めます ([`.github/workflows/release.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/release.yml))。番号はワークフローが決めるので、タグは入力ではなく結果です。`dry-run` を使うと、公開せずにどのバージョンを公開するかだけを表示します。',
    'npm auth goes through [Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers), so there is no `NPM_TOKEN`, and `--provenance` attaches provenance to the release.':
      'npm の認証は [Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) を通すので `NPM_TOKEN` はありません。`--provenance` でリリースに来歴 (provenance) を付けます。',
    '`bun run build:package` assembles what gets published into `publish/`: JS and `.d.ts` only, no sources.':
      '`bun run build:package` が公開するものを `publish/` に組み立てます。中身は JS と `.d.ts` だけで、ソースは含みません。',
    '## This site': '## このサイト',
    'The site is built by `bun run site` from the Markdown under `site/content/` and deployed to GitHub Pages by the `pages` workflow on every push to `main`. The Japanese edition (served under `/ja/`) is rendered from the same Markdown, swapping each paragraph for its translation in `site/i18n/ja/`. The generator is a single Bun script with no dependencies; Markdown is rendered by `Bun.markdown`.':
      'サイトは `bun run site` が `site/content/` の Markdown から組み立て、`main` への push のたびに `pages` ワークフローが GitHub Pages へデプロイします。日本語版 (`/ja/` の下に配信) は同じ Markdown から、段落ごとに `site/i18n/ja/` の訳へ置き換えて描画します。生成器は依存の無い 1 本の Bun スクリプトで、Markdown は `Bun.markdown` で描画します。',
  },
} satisfies PageTranslation;
