import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'はじめに',
  description: 'decopin-cli とは何か、その背後にある考え方。',
  blocks: {
    'Build CLIs the way Next.js builds web apps: file conventions, JSX output, and types that come from your declarations. TypeScript + Bun.':
      'Next.js が Web アプリを作るのと同じやり方で CLI を作ります。ファイル規約、JSX による出力、そして宣言から導かれる型。TypeScript + Bun で動きます。',
    'Output is JSX. There is no React; decopin ships its own small renderer.':
      '出力は JSX です。React は使いません。decopin は自前の小さなレンダラーを同梱しています。',
    '## The idea': '## 考え方',
    'A CLI has more inputs than argv. It reads stdin, or does not. It depends on environment variables it never lists. Its error output changes shape two subcommands down. In most CLIs these live inside the code, unstated, and the type checker cannot see any of them.':
      'CLI の入力は argv だけではありません。標準入力を読むこともあれば、読まないこともあります。どこにも列挙されていない環境変数に依存していることもあります。サブコマンドを 2 段下ると、エラー出力の形が変わることもあります。多くの CLI ではこれらがコードの中に暗黙のまま埋もれていて、型チェッカーからは何も見えません。',
    "decopin gives each of them a file with a fixed name. Every file you add does two things: it changes what the command does, and it changes the type of `CmdProps<'…'>` the next time `decopin build` or `decopin dev` runs. What you leave out is not guessed.":
      "decopin はそれぞれに決まった名前のファイルを割り当てます。ファイルを 1 つ足すたびに 2 つのことが起きます。コマンドの振る舞いが変わり、次に `decopin build` か `decopin dev` を実行したときに `CmdProps<'…'>` の型が変わります。書かなかったものが推測で補われることはありません。",
    'And once the inputs are declared instead of implied, everything that reads a declaration comes for free: `--help`, shell completion, the TypeScript types, and [an MCP server the CLI already is](/guides/mcp/) — `mycli __mcp`, with no tool definition to write and no second description to keep in sync.':
      '入力が暗黙ではなく宣言になれば、宣言を読むものはすべてタダで手に入ります。`--help`、シェル補完、TypeScript の型、そして [CLI 自体がそのまま MCP サーバー](/guides/mcp/)になること (`mycli __mcp`)。ツール定義を書く必要も、二重の説明を同期させ続ける必要もありません。',
    'There are three kinds of files, and they differ in where they may go:':
      'ファイルは 3 種類あり、置ける場所が違います:',
    '| Kind | Files | Where it goes |\n| --- | --- | --- |\n| **Conventions** | `cmd.tsx` `argv.tsx` `data.tsx` `output.tsx` `stdin.tsx` `help.tsx` `shell.tsx` `complete.tsx` | next to the command; applies to that command only |\n| **Inherited** | `layout.tsx` `middleware.tsx` `error.tsx` `not-found.tsx` | any directory; applies to everything below it |\n| **Root-only** | `env.tsx` `version.tsx` `global-error.tsx` | `app/` only; applies to the whole CLI |':
      '| 種類                   | ファイル                                                                                       | 置き場所                                     |\n| ---------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |\n| **規約ファイル**       | `cmd.tsx` `argv.tsx` `data.tsx` `output.tsx` `stdin.tsx` `help.tsx` `shell.tsx` `complete.tsx` | コマンドの隣。そのコマンドだけに効く         |\n| **継承されるファイル** | `layout.tsx` `middleware.tsx` `error.tsx` `not-found.tsx`                                      | どのディレクトリでもよい。その下すべてに効く |\n| **ルート専用ファイル** | `env.tsx` `version.tsx` `global-error.tsx`                                                     | `app/` のみ。CLI 全体に効く                  |',
    'Continue with [Setup](/getting-started/setup/), then [Project structure](/getting-started/project-structure/).':
      '続けて [セットアップ](/getting-started/setup/)、[プロジェクト構成](/getting-started/project-structure/) へ進んでください。',
  },
} satisfies PageTranslation;
