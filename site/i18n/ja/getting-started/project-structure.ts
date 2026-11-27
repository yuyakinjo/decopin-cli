import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'プロジェクト構成',
  description:
    '3 種類のファイル、それぞれを置ける場所、そしてそれぞれが型に何を足すか。',
  blocks: {
    'Directories starting with `_` never become commands. Put shared code there.':
      '`_` で始まるディレクトリはコマンドになりません。共有コードはそこに置きます。',
    '## Conventions': '## 規約ファイル',
    'A convention file sits next to `cmd.tsx` and applies to that command only.':
      '規約ファイルは `cmd.tsx` の隣に置き、そのコマンドだけに効きます。',
    '| File | What it does |\n| --- | --- |\n| [`cmd.tsx`](/conventions/cmd/) | the view. The only required file |\n| [`argv.tsx`](/conventions/argv/) | arguments and options: validation, `--help`, and types |\n| [`data.tsx`](/conventions/data/) | computes; the return value arrives as `data`, and as `--json` |\n| [`output.tsx`](/conventions/data/) | declares what `data.tsx` promises, and checks it at run time |\n| [`stdin.tsx`](/conventions/stdin/) | opts the command in to reading stdin, and says what it is |\n| [`help.tsx`](/conventions/help/) | overrides `--help` for this command or group |\n| [`shell.tsx`](/conventions/shell/) | what the parent shell should do afterwards (`cd`, `export`) |\n| [`complete.tsx`](/conventions/complete/) | completion candidates that only exist at run time |':
      '| ファイル                                 | 役割                                                       |\n| ---------------------------------------- | ---------------------------------------------------------- |\n| [`cmd.tsx`](/conventions/cmd/)           | ビュー。唯一の必須ファイル                                 |\n| [`argv.tsx`](/conventions/argv/)         | 引数とオプション。検証、`--help`、型                       |\n| [`data.tsx`](/conventions/data/)         | 計算する。戻り値が `data` として、また `--json` として届く |\n| [`output.tsx`](/conventions/data/)       | `data.tsx` が約束するものを宣言し、実行時に検査する        |\n| [`stdin.tsx`](/conventions/stdin/)       | そのコマンドが標準入力を読むことを宣言し、中身が何かを示す |\n| [`help.tsx`](/conventions/help/)         | このコマンドやグループの `--help` を差し替える             |\n| [`shell.tsx`](/conventions/shell/)       | 終了後に親シェルにさせたいこと (`cd`、`export`)            |\n| [`complete.tsx`](/conventions/complete/) | 実行時にしか決まらない補完候補                             |',
    '## Inherited': '## 継承されるファイル',
    'An inherited file applies to every command below the directory it is in. The closest one wins, and the chain continues outward.':
      '継承されるファイルは、置いたディレクトリより下のすべてのコマンドに効きます。いちばん近いものが優先され、そこから外側へと連なっていきます。',
    '| File | What it does |\n| --- | --- |\n| [`layout.tsx`](/inherited/layout/) | wraps the output |\n| [`middleware.tsx`](/inherited/middleware/) | wraps the execution. Nothing inside runs until you call `next()` |\n| [`error.tsx`](/inherited/error/) | the view for a failure |\n| [`not-found.tsx`](/inherited/not-found/) | the view for `notFound()` and for an unknown subcommand |':
      '| ファイル                                   | 役割                                              |\n| ------------------------------------------ | ------------------------------------------------- |\n| [`layout.tsx`](/inherited/layout/)         | 出力を包む                                        |\n| [`middleware.tsx`](/inherited/middleware/) | 実行を包む。`next()` を呼ぶまで内側は何も動かない |\n| [`error.tsx`](/inherited/error/)           | 失敗したときのビュー                              |\n| [`not-found.tsx`](/inherited/not-found/)   | `notFound()` と未知のサブコマンドに対するビュー   |',
    '## Root-only': '## ルート専用ファイル',
    'A root-only file lives in `app/` and applies to the whole CLI. Placing one anywhere else is a build error.':
      'ルート専用ファイルは `app/` に置き、CLI 全体に効きます。ほかの場所に置くとビルドエラーになります。',
    '| File | What it does |\n| --- | --- |\n| [`env.tsx`](/root-only/env/) | declares environment variables, validated at startup |\n| [`version.tsx`](/root-only/version/) | what `--version` prints |\n| [`global-error.tsx`](/root-only/global-error/) | the last error view when no `error.tsx` caught it |':
      '| ファイル                                       | 役割                                                        |\n| ---------------------------------------------- | ----------------------------------------------------------- |\n| [`env.tsx`](/root-only/env/)                   | 環境変数を宣言し、起動時に検証する                          |\n| [`version.tsx`](/root-only/version/)           | `--version` が出力するもの                                  |\n| [`global-error.tsx`](/root-only/global-error/) | どの `error.tsx` も受け止めなかったときの最後のエラービュー |',
    '## The order they run in': '## 呼ばれる順番',
    'Only the closest `error.tsx` is called. The next one out, and finally `global-error.tsx`, is called only when the closer one throws. `not-found.tsx` is always the closest one alone. `example.tsx` never runs here: `decopin docs` reads it.':
      '呼ばれるのはいちばん近い `error.tsx` だけです。その外側のもの、そして最後の `global-error.tsx` が呼ばれるのは、内側のものが例外を投げたときだけです。`not-found.tsx` は常にいちばん近いもの 1 つだけが呼ばれます。`example.tsx` はここでは動きません。読むのは `decopin docs` です。',
    '## Where the types come from': '## 型はどこから来るか',
    "`decopin build` and `decopin dev` write `.decopin/types.d.ts` from the files above. `CmdProps<'user/import'>` is the command's path, and each prop on it traces back to one file:":
      "`decopin build` と `decopin dev` は、上のファイルから `.decopin/types.d.ts` を書き出します。`CmdProps<'user/import'>` の型引数はコマンドのパスで、その各 prop はどれか 1 つのファイルにたどり着きます:",
    '| Prop | Comes from | When the file is absent |\n| --- | --- | --- |\n| `args` | `<Arg>` in `argv.tsx` | `{}` |\n| `options` | `<Option>` in `argv.tsx` | `{}` |\n| `stdin` | `stdin.tsx` | `never`, and stdin is never read |\n| `env` | `env.tsx` at the root | `{}` |\n| `data` | `data.tsx` (or `output.tsx`) | `never` |\n| `dryRun` | the reserved `--dry-run` flag | always `boolean` |\n| `argv` | what was left after routing | always `readonly string[]` |\n| `cwd` | the working directory | always `string` |':
      '| Prop      | 由来                             | ファイルが無いとき                |\n| --------- | -------------------------------- | --------------------------------- |\n| `args`    | `argv.tsx` の `<Arg>`            | `{}`                              |\n| `options` | `argv.tsx` の `<Option>`         | `{}`                              |\n| `stdin`   | `stdin.tsx`                      | `never`。標準入力は一切読まれない |\n| `env`     | ルートの `env.tsx`               | `{}`                              |\n| `data`    | `data.tsx` (または `output.tsx`) | `never`                           |\n| `dryRun`  | 予約済みの `--dry-run` フラグ    | 常に `boolean`                    |\n| `argv`    | ルーティング後に残ったもの       | 常に `readonly string[]`          |\n| `cwd`     | 作業ディレクトリ                 | 常に `string`                     |',
    'The generated file is a module augmentation of `decopin-cli`, so the same import works before and after the first build. Before it, `args` and `options` are `Record<string, unknown>`; after it they are exact.':
      '生成されるファイルは `decopin-cli` のモジュール拡張 (module augmentation) なので、最初のビルドの前でも後でも同じ import で動きます。ビルド前の `args` と `options` は `Record<string, unknown>` で、ビルド後は正確な型になります。',
  },
} satisfies PageTranslation;
