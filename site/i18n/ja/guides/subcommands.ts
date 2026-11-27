import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'サブコマンド',
  description: 'ディレクトリのツリーがそのままサブコマンドのツリーになります。',
  blocks: {
    'The directory tree is the subcommand tree. A directory without a `cmd.tsx` is a group, and it lists what is under it.':
      'ディレクトリのツリーがそのままサブコマンドのツリーです。`cmd.tsx` の無いディレクトリはグループで、その下にあるものを一覧表示します。',
    "The list carries each command's `description`, and every argument or option that has a `default` is spelled out, so nothing happens implicitly when a flag is left off.":
      '一覧には各コマンドの `description` が載り、`default` を持つ引数やオプションはすべて明記されます。フラグを省いたときに暗黙に何かが起きることはありません。',
    'Asking for `--help` explicitly prints to stdout and exits 0. Ending up without a command prints to stderr and exits 2.':
      '明示的に `--help` を求めた場合は stdout に出力して終了コード 0 で終わります。コマンドを指定せずに終わった場合は stderr に出力して終了コード 2 で終わります。',
    '## Groups can have files too': '## グループもファイルを持てる',
    'A group directory holds the [inherited files](/getting-started/project-structure/#inherited) for everything below it, and a [`help.tsx`](/conventions/help/) that decorates its listing. It cannot hold `argv.tsx`, `stdin.tsx` or the other per-command conventions, because there is no command for them to describe.':
      'グループのディレクトリには、その下すべてに効く [継承されるファイル](/getting-started/project-structure/#inherited) と、一覧を装飾する [`help.tsx`](/conventions/help/) を置けます。`argv.tsx` や `stdin.tsx` など、コマンドごとの規約ファイルは置けません。説明する対象のコマンドが無いからです。',
    '## Unknown subcommands': '## 未知のサブコマンド',
    '`cli user shwo` renders the nearest [`not-found.tsx`](/inherited/not-found/) with the closest match as a suggestion, and exits 2.':
      '`cli user shwo` は、いちばん近い [`not-found.tsx`](/inherited/not-found/) を最も近い候補とともに描画し、終了コード 2 で終わります。',
    '## Shared code': '## 共有コード',
    'Directories starting with `_` never become commands. `app/_shared/` is the usual place for code several commands import.':
      '`_` で始まるディレクトリはコマンドになりません。複数のコマンドが import するコードは `app/_shared/` に置くのが通例です。',
  },
} satisfies PageTranslation;
