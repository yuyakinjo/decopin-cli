import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'シェル補完',
  description:
    'CLI 自身に問い合わせる zsh の薄いスクリプトなので、古くなりません。',
  blocks: {
    '`bun run build` also writes a zsh completion shim to `dist/completions/_<bin>`. Put it on your `$fpath` (before `compinit` runs) and Tab completion works for subcommands, option names, and `Type.Enum` values:':
      '`bun run build` は zsh の補完スクリプトも `dist/completions/_<bin>` に書き出します。これを `$fpath` に置けば (`compinit` の実行より前に)、サブコマンド、オプション名、`Type.Enum` の値が Tab で補完されます:',
    "The shim is thin on purpose: on every Tab it asks the CLI itself (`mycli __complete`) for candidates, so the file never changes when you add or remove commands. Rebuilding the CLI is enough, and zsh's completion cache never goes stale. `__complete` is reserved by the framework and hidden from help. When there are no candidates, completion falls back to filenames.":
      'スクリプトはわざと薄くしてあります。Tab を押すたびに CLI 自身 (`mycli __complete`) に候補を問い合わせるので、コマンドを追加・削除してもファイルは変わりません。CLI をビルドし直すだけで済み、zsh の補完キャッシュが古くなることもありません。`__complete` はフレームワークが予約しており、ヘルプには表示されません。候補が無いときはファイル名の補完にフォールバックします。',
    '## Candidates that only exist at run time':
      '## 実行時にしか存在しない候補',
    '`Type.Enum` values complete from the declaration. For names that only exist at run time (a cluster, a branch, a user) add [`complete.tsx`](/conventions/complete/) next to the command.':
      '`Type.Enum` の値は宣言から補完されます。実行時にしか存在しない名前 (クラスター、ブランチ、ユーザーなど) には、コマンドの隣に [`complete.tsx`](/conventions/complete/) を置きます。',
  },
} satisfies PageTranslation;
