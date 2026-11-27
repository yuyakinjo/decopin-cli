import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: '予約済みのオプション',
  description: 'すべてのコマンドでフレームワークが処理するフラグ。',
  blocks: {
    '`--help`, `-h`, `--version`, `--no-color`, `--json` and `--dry-run` are handled by the framework. Declaring any of them in `argv.tsx` is a build error.':
      '`--help`、`-h`、`--version`、`--no-color`、`--json`、`--dry-run` はフレームワークが処理します。これらを `argv.tsx` で宣言するとビルドエラーになります。',
    '| Flag | What it does |\n| --- | --- |\n| `--help` `-h` | prints usage to stdout, exit 0. Overridable with [`help.tsx`](/conventions/help/) |\n| `--version` | prints what [`version.tsx`](/root-only/version/) declares |\n| `--no-color` | disables colour even on a TTY (`NO_COLOR` and `TERM=dumb` do the same) |\n| `--json` | skips the view and prints what [`data.tsx`](/conventions/data/) returned |\n| `--dry-run` | sets `dryRun: true` on every command, `data.tsx` and middleware |':
      '| フラグ        | 動作                                                                                             |\n| ------------- | ------------------------------------------------------------------------------------------------ |\n| `--help` `-h` | 使い方を stdout に出力し、終了コード 0 で終わる。[`help.tsx`](/conventions/help/) で上書きできる |\n| `--version`   | [`version.tsx`](/root-only/version/) が宣言した内容を出力する                                    |\n| `--no-color`  | TTY でも色を無効にする (`NO_COLOR` と `TERM=dumb` も同じ)                                        |\n| `--json`      | ビューを飛ばし、[`data.tsx`](/conventions/data/) が返したものを出力する                          |\n| `--dry-run`   | すべてのコマンド、`data.tsx`、ミドルウェアに `dryRun: true` を渡す                               |',
    'Two subcommand names are reserved as well, and hidden from help: `__complete` (used by [shell completion](/guides/shell-completion/)) and `__mcp` (the [MCP server](/guides/mcp/)). `__shell` prints the hook for [`shell.tsx`](/conventions/shell/).':
      'サブコマンド名も 2 つ予約されていて、ヘルプには表示されません。`__complete` ([シェル補完](/guides/shell-completion/) が使う) と `__mcp` ([MCP サーバー](/guides/mcp/)) です。`__shell` は [`shell.tsx`](/conventions/shell/) 用のフックを出力します。',
    '## --dry-run is the honest kind': '## --dry-run は正直な実装',
    "The framework strips the flag and hands every command, `data.tsx` and middleware a `dryRun: boolean`. It does not intercept file writes or network calls for you. We measured: a static `import { writeFile } from 'node:fs/promises'` binds at link time and never sees a runtime patch, and Bun's bundler never lets a plugin redirect a builtin, so any \"automatic\" dry run would silently miss the most common write API. A flag that is trusted and then writes anyway is worse than no flag, so honouring it is the command's job:":
      "フレームワークはフラグを取り除き、すべてのコマンド、`data.tsx`、ミドルウェアに `dryRun: boolean` を渡します。ファイルへの書き込みやネットワーク呼び出しを代わりに横取りすることはしません。実際に計測したところ、静的な `import { writeFile } from 'node:fs/promises'` はリンク時に束縛されるため実行時のパッチが届かず、Bun のバンドラーはプラグインに組み込みモジュールの差し替えを許しません。つまり「自動」のドライランは、最もよく使われる書き込み API を黙って取りこぼすことになります。信じて使ったのに結局書き込んでしまうフラグは、フラグが無いより悪いので、フラグを守るのはコマンドの役目です:",
    '## DECOPIN_DEBUG': '## DECOPIN_DEBUG',
    'Debug output is an environment variable, `DECOPIN_DEBUG=1`, rather than a flag, so that `--verbose` and `--debug` stay free for your own options. See [error.tsx](/inherited/error/#debugging).':
      'デバッグ出力はフラグではなく環境変数 `DECOPIN_DEBUG=1` で有効にします。`--verbose` や `--debug` を自分のオプションのために空けておくためです。[error.tsx](/inherited/error/#debugging) を参照してください。',
  },
} satisfies PageTranslation;
