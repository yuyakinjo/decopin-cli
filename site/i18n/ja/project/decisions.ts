import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: '設計判断とその理由',
  description: '判断の理由がどこにあり、どうやってずれないようにしているか。',
  blocks: {
    'The reasoning lives in [docs/decisions.md](https://github.com/yuyakinjo/decopin-cli/blob/main/docs/decisions.md): why not Ink, why types are generated at build time, why middleware takes `next` instead of `children`, and so on. It is written in Japanese, as are the code comments. Everything that leaves the repository (CLI output, generated files, the README) is in English. This site is the one exception: it also has a Japanese edition, kept in step by `test/docs/site-i18n.test.ts`.':
      '判断の理由は [docs/decisions.md](https://github.com/yuyakinjo/decopin-cli/blob/main/docs/decisions.md) にあります。なぜ Ink を使わないのか、なぜ型をビルド時に生成するのか、なぜ middleware は `children` ではなく `next` を受け取るのか、などです。コードのコメントと同じく日本語で書かれています。リポジトリの外に出るもの (CLI の出力、生成されるファイル、README) は英語です。このサイトだけは例外で日本語版もあり、`test/docs/site-i18n.test.ts` が英語版とそろっているかを見ています。',
    '## No spec document': '## 仕様書は持たない',
    'The behaviour itself is pinned by table-driven tests in [`test/contract/`](https://github.com/yuyakinjo/decopin-cli/tree/main/test/contract). There is no spec document: a document nobody executes drifts away from the code. An earlier 1,266-line spec accumulated nine features that were described but never implemented, which is where the rule comes from.':
      '挙動そのものは [`test/contract/`](https://github.com/yuyakinjo/decopin-cli/tree/main/test/contract) の表駆動テストで固定しています。仕様書はありません。誰も実行しない文書はコードから離れていくからです。かつて 1,266 行の仕様書があり、書いてあるのに実装されていない機能が 9 つたまりました。このルールはそこから来ています。',
    '| What | Where it lives | Why it does not rot |\n| --- | --- | --- |\n| promised behaviour | table-driven tests in `test/contract/` | they run |\n| how to use it | the README and this site | the examples are type-checked and executed by `test/docs/` |\n| decisions and why | `docs/decisions.md` | facts at the time of deciding |\n| per-API reasons | JSDoc on the public symbols | next to the implementation |':
      '| 何を           | どこに置くか                    | 腐らない理由                           |\n| -------------- | ------------------------------- | -------------------------------------- |\n| 約束した挙動   | `test/contract/` の表駆動テスト | 実行される                             |\n| 使い方         | README とこのサイト             | 例を `test/docs/` が型検査し、実行する |\n| 判断とその理由 | `docs/decisions.md`             | 判断した時点の事実だから               |\n| API ごとの理由 | 公開シンボルの JSDoc            | 実装の隣にある                         |',
    '## Decisions are guarded': '## 判断は守られている',
    'Whether those decisions still hold is checked by [`test/docs/decisions.test.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/test/docs/decisions.test.ts): every ADR carries a lint, test, or manual guard, and adding an ADR fails the suite until you choose one. Dangling references are caught by [`test/docs/references.test.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/test/docs/references.test.ts).':
      'それらの判断が今も守られているかは [`test/docs/decisions.test.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/test/docs/decisions.test.ts) が検査します。どの ADR にも lint・テスト・手動のいずれかの守り方が付いていて、ADR を足すとどれかを選ぶまでテストが落ちます。宙に浮いた参照は [`test/docs/references.test.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/test/docs/references.test.ts) が捕まえます。',
  },
} satisfies PageTranslation;
