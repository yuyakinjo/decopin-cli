import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'セットアップ',
  description:
    'プロジェクトを新しく作るか、既存のプロジェクトに decopin-cli を追加します。',
  blocks: {
    'To add commands and other convention files after setup, use [`gen`](/guides/scaffold/).':
      'セットアップ後にコマンドやほかの規約ファイルを追加するには [`gen`](/guides/scaffold/) を使います。',
    '## By hand': '## 手で導入する',
    'Your `tsconfig.json` needs the JSX settings. **Without them TypeScript and Bun both look for React** and the build fails with `Could not resolve: react/jsx-runtime` (`decopin build` / `decopin dev` warn you about these two settings, unless your tsconfig uses `extends`).':
      '`tsconfig.json` には JSX の設定が必要です。**これが無いと TypeScript も Bun も React を探しに行き**、ビルドが `Could not resolve: react/jsx-runtime` で失敗します (tsconfig が `extends` を使っていない限り、`decopin build` / `decopin dev` がこの 2 つの設定について警告します)。',
    '`.decopin/types.d.ts` is where the generated types land. Keep it in `include`, and keep `.decopin/` out of version control.':
      '生成された型は `.decopin/types.d.ts` に置かれます。これを `include` に入れておき、`.decopin/` はバージョン管理から外してください。',
    '## Build and watch': '## ビルドと監視',
    '`build` prints one node per command with the files that produced it, so the conventions are readable right where they took effect:':
      '`build` はコマンドごとに 1 つのノードを、それを形作ったファイルと一緒に表示します。どの規約がどこで効いたのかをその場で読み取れます:',
    'The marker before each file says which of the three kinds it is, and the legend under the tree repeats it. An inherited file is named by where it sits, so you know which directory to open. Root-only files apply everywhere, so they are listed once at the bottom rather than on every node. Terminals without UTF-8 get `f`, `^` and `*` instead.':
      '各ファイルの前の記号は 3 種類のどれかを表し、ツリーの下の凡例でも同じことを示しています。継承されるファイルは置かれている場所で表示されるので、どのディレクトリを開けばよいかがわかります。ルート専用ファイルはどこにでも効くので、各ノードではなく末尾に一度だけ並べます。UTF-8 が使えない端末では代わりに `f`、`^`、`*` が出ます。',
    "`decopin dev` also fills in the `CmdProps<'…'>` annotation when it sees a `cmd.tsx` without one, so a new command is typed as soon as the file is saved.":
      "`decopin dev` は、注釈の無い `cmd.tsx` を見つけると `CmdProps<'…'>` の注釈も書き足します。新しいコマンドは保存した瞬間から型が付きます。",
    "The same pass annotates declaration files with their return type — `ArgvDefinition`, `StdinDefinition`, `OutputDefinition`, `ShellDefinition`, `EnvDefinition`, `VersionDefinition`, and `DataResult<'…'>` for a `data.tsx` whose command declares an `output.tsx`:":
      "同じ処理で、宣言ファイルにも戻り値の型を書き足します。`ArgvDefinition`、`StdinDefinition`、`OutputDefinition`、`ShellDefinition`、`EnvDefinition`、`VersionDefinition`、そして `output.tsx` を宣言したコマンドの `data.tsx` には `DataResult<'…'>` です:",
    'Files that already carry a return type are left untouched, byte for byte. The JSX ones say that the file returns an element and nothing more — a JSX expression cannot carry a type argument, so the shape inside is checked when the CLI builds, not while you type. `DataResult` is the exception: it does not go through JSX, so a `data.tsx` that disagrees with its `output.tsx` fails to type-check. See [data.tsx and output.tsx](/conventions/data/).':
      'すでに戻り値の型を持つファイルは 1 バイトも変えずにそのまま残します。JSX のファイルの型が表すのは「要素を返す」ということだけです。JSX の式は型引数を持てないので、中身の形は入力中ではなく CLI のビルド時に検査されます。`DataResult` は例外です。JSX を通らないので、`output.tsx` と食い違う `data.tsx` は型検査で落ちます。[data.tsx と output.tsx](/conventions/data/) を参照してください。',
    '## Distributing': '## 配布する',
    '`bun build --compile` turns `dist/index.js` into a single binary that does not need Bun on the target machine. `--bytecode` on top removes about a fifth of the startup time; see [Startup cost](/guides/startup-cost/).':
      '`bun build --compile` を使うと、`dist/index.js` を配布先に Bun が無くても動く単一のバイナリにできます。さらに `--bytecode` を付けると起動時間がおよそ 5 分の 1 縮みます。[起動コスト](/guides/startup-cost/) を参照してください。',
  },
} satisfies PageTranslation;
