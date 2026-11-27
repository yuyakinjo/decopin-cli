import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'not-found.tsx と notFound()',
  description:
    '未知のサブコマンドにも、コマンドが見つけられなかった値にも使える 1 つのビュー。候補の提示まで自動で行います。',
  blocks: {
    '`notFound()` can be called from anywhere in a command. It renders the nearest `not-found.tsx` and picks the exit code, and if you hand it the valid values it works out the suggestion for you:':
      '`notFound()` はコマンドのどこからでも呼べます。いちばん近い `not-found.tsx` を描画して終了コードを選び、有効な値を渡せば候補の提示まで自動で行います:',
    '`not-found.tsx` is inherited from parent directories the way `error.tsx` is, so a subcommand can have its own wording. One view serves both cases, an unknown command and a `notFound()` call, and tells them apart with `what`. Under `--json` the failure is structured with `code: "not-found"`.':
      '`not-found.tsx` は `error.tsx` と同じように親ディレクトリから継承されるので、サブコマンドごとに言い回しを変えられます。未知のコマンドと `notFound()` の呼び出しの両方を 1 つのビューが受け持ち、`what` で区別します。`--json` では `code: "not-found"` として構造化された失敗になります。',
    'At the root, `not-found.tsx` is also the view for a command that does not exist at all (`cli usre list`), which is why it is listed under both inherited and root-only files.':
      'ルートに置いた `not-found.tsx` は、まったく存在しないコマンド (`cli usre list`) に対するビューにもなります。継承されるファイルとルート専用ファイルの両方に挙がっているのはそのためです。',
    '## Using the suggestion machinery yourself':
      '## 候補提示の仕組みを自分で使う',
    'The suggestion machinery is exported rather than kept inside the framework, so you can use it for your own values:':
      '候補提示の仕組みはフレームワークの内側に閉じず export しているので、自分の値にも使えます:',
  },
} satisfies PageTranslation;
