import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: '開発',
  description: 'decopin-cli 自体の開発について。',
  blocks: {
    '`bun run ci` runs exactly what CI runs ([`.github/workflows/ci.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/ci.yml)).':
      '`bun run ci` は CI とまったく同じものを実行します ([`.github/workflows/ci.yml`](https://github.com/yuyakinjo/decopin-cli/blob/main/.github/workflows/ci.yml))。',
    '## Layout of the source': '## ソースの構成',
    'The three directories under `features/` are the same three kinds of files this site is organised by. Each feature owns its file name, its build-time evaluation, its runtime, and its contribution to the generated types.':
      '`features/` の下の 3 つのディレクトリは、このサイトの分け方と同じ 3 種類のファイルに対応しています。各機能が、自分のファイル名、ビルド時の評価、実行時の処理、生成される型への寄与をまとめて持ちます。',
    '## Tests': '## テスト',
    'Unit tests mirror `src/`: the tests for `src/core/renderer/` live in `test/core/renderer/`, and every source directory has at least one test file next to its twin. `bun run check:layout` enforces this, and CI runs it.':
      'ユニットテストは `src/` と同じ構成です。`src/core/renderer/` のテストは `test/core/renderer/` にあり、どのソースディレクトリにも対になる場所にテストファイルが 1 つ以上あります。`bun run check:layout` がこれを強制し、CI でも実行します。',
    '| Directory | What it pins |\n| --- | --- |\n| `test/cli/`, `test/core/`, `test/features/` | each source directory on its own, mirroring `src/` |\n| `test/contract/` | promised behaviour, as tables |\n| `test/docs/` | the README and this site: tsx blocks type-check, shell examples run |\n| `test/integration/` | each subcommand end to end, the way a user runs it |':
      '| ディレクトリ                                | 固定しているもの                                                  |\n| ------------------------------------------- | ----------------------------------------------------------------- |\n| `test/cli/`, `test/core/`, `test/features/` | `src/` と対になる、ソースディレクトリ単位のテスト                 |\n| `test/contract/`                            | 約束した挙動を表の形で                                            |\n| `test/docs/`                                | README とこのサイト。tsx ブロックを型検査し、シェルの例を実行する |\n| `test/integration/`                         | 各サブコマンドを、利用者が動かすのと同じ形で端から端まで          |',
    '## Starting a new subcommand': '## 新しいサブコマンドを始めるとき',
    'Before writing `src/cli/<name>/`, write two things down (in the issue or the ADR, not in code):':
      '`src/cli/<name>/` を書く前に、2 つのことを書き出します (コードではなく issue か ADR に):',
    '1. **Its purpose in one sentence**: what someone can do that they could not before. If the sentence will not come, the design is not settled yet. This step is where `decopin docs` dropped its "click to run" HTML and became "know the result without running it" (ADR 45).\n2. **The outcomes a user can observe**, each one a place you would go to fix a failure. Leave the output format out of them; that is what changes while implementing.':
      '1. **目的を 1 文で**: それまでできなかった何ができるようになるのか。1 文が出てこないなら、まだ設計が固まっていません。`decopin docs` が「クリックで実行」する HTML をやめ、「実行せずに結果がわかる」ものになったのはこの段階でした (ADR 45)。\n2. **利用者が観察できる結果**。どれも、失敗したときに直しに行く場所になるものです。出力の形式は含めません。そこは実装中に変わる部分です。',
    'Each outcome then becomes a test in `test/integration/<name>.test.ts`.':
      'それぞれの結果が `test/integration/<name>.test.ts` のテストになります。',
  },
} satisfies PageTranslation;
