import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'スキャフォールド',
  description: 'init でプロジェクトを作り、gen で規約ファイルを追加します。',
  blocks: {
    'Use `init` to create a project and `gen` to add individual files as your CLI grows. Both keep existing files.':
      'プロジェクトを作るには `init` を、CLI が育つにつれて個別のファイルを足すには `gen` を使います。どちらも既存のファイルは残します。',
    '## Create a project': '## プロジェクトを作る',
    '`init` creates `package.json`, `tsconfig.json`, `.gitignore`, and a working `app/hello/` command with `argv.tsx` and `cmd.tsx`. It then installs `decopin-cli` and `@types/bun`. Omit the directory to use the current folder, or pass `--no-install` to create the files without installing dependencies. See [Setup](/getting-started/setup/) for the configuration details.':
      '`init` は `package.json`、`tsconfig.json`、`.gitignore` と、`argv.tsx` と `cmd.tsx` を持つ動く `app/hello/` コマンドを作ります。そのあと `decopin-cli` と `@types/bun` をインストールします。ディレクトリを省略すると現在のフォルダを使い、`--no-install` を付けると依存をインストールせずにファイルだけを作ります。設定の詳細は [セットアップ](/getting-started/setup/) を参照してください。',
    '## Generate a command': '## コマンドを生成する',
    'Run these from your project directory:':
      'プロジェクトのディレクトリで実行します:',
    "The first command creates `app/greet/cmd.tsx`, which prints `Hello, world!`. The second creates `app/greet/argv.tsx` with an empty argument declaration. Edit these files to define your command's output, arguments, and options.":
      '1 つ目のコマンドは `Hello, world!` を出力する `app/greet/cmd.tsx` を、2 つ目は空の引数宣言を持つ `app/greet/argv.tsx` を作ります。これらのファイルを編集して、コマンドの出力・引数・オプションを定義します。',
    'Each invocation creates one `.tsx` file and any missing directories. Generating `argv`, `data`, or another supporting file does not also create `cmd.tsx`; a directory becomes a command when it has `cmd.tsx`.':
      '1 回の実行で作るのは `.tsx` ファイル 1 つと、足りないディレクトリだけです。`argv` や `data` などの補助ファイルを生成しても、`cmd.tsx` までは作りません。ディレクトリは `cmd.tsx` を持ったときにコマンドになります。',
    '## Choose a file category': '## ファイルの種類を選ぶ',
    'Choose exactly one category flag and a file name without an extension:':
      '種類のフラグをちょうど 1 つと、拡張子を除いたファイル名を指定します:',
    '| Flag | Supported names |\n| --- | --- |\n| `--conv` | `cmd`, `argv`, `stdin`, `data`, `output`, `error`, `not-found`, `layout`, `middleware`, `help`, `shell`, `complete` |\n| `--inherited` | `error`, `not-found`, `layout`, `middleware` |\n| `--root-only` | `global-error`, `not-found`, `env`, `version` |':
      '| フラグ        | 指定できる名前                                                                                                      |\n| ------------- | ------------------------------------------------------------------------------------------------------------------- |\n| `--conv`      | `cmd`, `argv`, `stdin`, `data`, `output`, `error`, `not-found`, `layout`, `middleware`, `help`, `shell`, `complete` |\n| `--inherited` | `error`, `not-found`, `layout`, `middleware`                                                                        |\n| `--root-only` | `global-error`, `not-found`, `env`, `version`                                                                       |',
    'Inherited files share their templates and names with the corresponding convention files. Their location determines which subtree they apply to; `app/user/layout.tsx` wraps the commands under `user`. A group does not need its own `cmd.tsx` to hold inherited files.':
      '継承されるファイルは、対応する規約ファイルとテンプレートも名前も共通です。どのサブツリーに効くかは置き場所で決まります。`app/user/layout.tsx` は `user` の下のコマンドを包みます。継承されるファイルを置くのに、グループ自身の `cmd.tsx` は要りません。',
    "`--root-only` requires the app root as its destination. `not-found` appears in more than one category because it handles unknown commands at the root and can also handle missing resources or subcommands in a subtree. See [Project structure](/getting-started/project-structure/) for each file's role.":
      '`--root-only` の置き先はアプリのルートでなければなりません。`not-found` が複数の種類に出てくるのは、ルートでは未知のコマンドを扱い、サブツリーでは見つからないリソースやサブコマンドも扱えるからです。各ファイルの役割は [プロジェクト構成](/getting-started/project-structure/) を参照してください。',
    '## Choose a destination': '## 置き先を選ぶ',
    '`--path` is a directory relative to the current working directory. It defaults to the app root, which is `app` unless you set `--app`:':
      '`--path` は現在の作業ディレクトリからの相対のディレクトリです。既定はアプリのルートで、`--app` を指定しなければ `app` です:',
    'The destination must be inside that root. Directories ignored by the router (names starting with `_` or `.`, and `node_modules`) are rejected. Symbolic links at the app root or between it and the destination are also rejected, including links to directories inside the app.':
      '置き先はそのルートの内側でなければなりません。ルーターが無視するディレクトリ (`_` や `.` で始まる名前と `node_modules`) は拒否します。アプリのルートや、ルートから置き先までの間にあるシンボリックリンクも、アプリ内のディレクトリを指すものを含めて拒否します。',
    '## Existing files and next steps': '## 既存のファイルと次の一歩',
    '`gen` reports `Wrote` for a new file and `Kept` when a file already exists. It preserves both `.tsx` and `.ts` implementations, as well as legacy `command.tsx` or `command.ts` when generating `cmd`. It does not overwrite them.':
      '`gen` は新しいファイルなら `Wrote`、すでにあるファイルなら `Kept` と報告します。`.tsx` と `.ts` の実装はどちらも残し、`cmd` を生成するときは旧名の `command.tsx` や `command.ts` も残します。上書きはしません。',
    'After editing your templates, run `bun run build` to update the generated types and executable. For the full list of generator options, run:':
      'テンプレートを編集したら、`bun run build` を実行して生成される型と実行ファイルを更新します。生成器のオプションの一覧は次で確認できます:',
  },
} satisfies PageTranslation;
