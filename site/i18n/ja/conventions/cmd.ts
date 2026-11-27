import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'cmd.tsx',
  description: 'ビュー。コマンドに必要な唯一のファイル。',
  blocks: {
    '`cmd.tsx` is the one required file. It receives everything the other files declared and returns JSX, which the renderer writes to the terminal.':
      '`cmd.tsx` は唯一の必須ファイルです。ほかのファイルが宣言したものをすべて受け取り、JSX を返します。それをレンダラーが端末に書き出します。',
    "`CmdProps<'hello'>` is keyed by the command's path (`'user/import'` for `app/user/import/cmd.tsx`). See [where the types come from](/getting-started/project-structure/#where-the-types-come-from) for the full list of props.":
      "`CmdProps<'hello'>` の型引数はコマンドのパスです (`app/user/import/cmd.tsx` なら `'user/import'`)。props の一覧は [型はどこから来るか](/getting-started/project-structure/#where-the-types-come-from) を参照してください。",
    '## Async commands': '## 非同期のコマンド',
    'A command may be `async`. Output is written when the promise settles, unless part of it opts in to [Partial Repainting](/guides/partial-repainting/).':
      'コマンドは `async` にできます。出力は Promise が決着したときに書き出されます。ただし、一部が [部分再描画](/guides/partial-repainting/) を使う場合は別です。',
    '## Exports the framework reads': '## フレームワークが読む export',
    '| Export | Effect |\n| --- | --- |\n| `export default` | the command |\n| `export const skipLayout` | `true` opts this command out of every inherited `layout.tsx` |\n| `export const unsafeEval` | `true` lets the command through `--strict-effects` (see [MCP](/guides/mcp/)) |':
      '| Export                    | 効果                                                                                    |\n| ------------------------- | --------------------------------------------------------------------------------------- |\n| `export default`          | コマンド本体                                                                            |\n| `export const skipLayout` | `true` にすると、継承されるすべての `layout.tsx` からこのコマンドを外す                 |\n| `export const unsafeEval` | `true` にすると、`--strict-effects` でもこのコマンドを通す ([MCP](/guides/mcp/) を参照) |',
    '## Deprecated name': '## 非推奨の名前',
    '`command.tsx` (and `command.ts`) still works, but `decopin build` warns, and it is removed after 2027-09-02. Rename to `cmd.tsx`.':
      '`command.tsx` (と `command.ts`) は今も動きますが、`decopin build` が警告し、2027-09-02 以降に削除されます。`cmd.tsx` に名前を変えてください。',
  },
} satisfies PageTranslation;
