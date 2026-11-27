import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'shell.tsx',
  description: 'シェルスクリプトを書かずに、親シェルで cd や export をします。',
  blocks: {
    'A child process cannot `cd` for its parent or `export` into it. That is why `z`, `direnv` and friends are shell functions. `shell.tsx` gives you the same trick without writing shell: declare what should happen, and the framework writes the shell code with the quoting done.':
      '子プロセスは親のために `cd` することも、親へ `export` することもできません。`z` や `direnv` などがシェル関数として作られているのはそのためです。`shell.tsx` を使うと、シェルを書かずに同じことができます。起きてほしいことを宣言すれば、クォート処理まで済ませたシェルのコードをフレームワークが書き出します。',
    '## Installing the hook': '## フックを入れる',
    'Install the hook once in your rc file, the way `zoxide init` works:':
      '`zoxide init` と同じ要領で、rc ファイルに一度だけフックを入れます:',
    "The hook is a function with the CLI's name. It runs the real binary with a temp file path in `DECOPIN_SHELL_FILE`, and if the command succeeded and wrote to it, sources the file. stdout and stderr are untouched, so pipes keep working. Without the hook, the command still runs; it just tells you on stderr that the shell changes were not applied.":
      'フックは CLI と同じ名前の関数です。`DECOPIN_SHELL_FILE` に一時ファイルのパスを入れて本物のバイナリを実行し、コマンドが成功してそのファイルに書き込んでいれば、それを source します。stdout と stderr には手を触れないので、パイプはそのまま動きます。フックが無くてもコマンドは動き、シェルへの変更が反映されなかったことを stderr で知らせるだけです。',
    '## Components': '## コンポーネント',
    '`Shell.Cd`, `Shell.Export`, `Shell.Unset`, `Shell.Alias` and `Shell.Source` quote their values; `Shell.Raw` passes code through verbatim when you need something else.':
      '`Shell.Cd`、`Shell.Export`、`Shell.Unset`、`Shell.Alias`、`Shell.Source` は値をクォートします。それ以外のことが必要なときは、`Shell.Raw` がコードをそのまま通します。',
    'Quoting is literal: `<Shell.Source file="$HOME/.zshrc" />` looks for a file called `$HOME/.zshrc`, and `~` is not expanded either. Build the path in TypeScript instead:':
      'クォートは文字どおりです。`<Shell.Source file="$HOME/.zshrc" />` は `$HOME/.zshrc` という名前のファイルを探しますし、`~` も展開されません。代わりに TypeScript でパスを組み立ててください:',
  },
} satisfies PageTranslation;
