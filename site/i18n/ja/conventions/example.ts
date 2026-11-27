import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'example.tsx',
  description:
    '実行できる使用例を宣言すると、decopin docs が実行して出力を貼り込みます。',
  blocks: {
    '`decopin docs` turns `app/` into a Markdown reference: every command, how to call it, and — for commands that declare examples — what they actually print. The examples are declared in `example.tsx` next to the command:':
      '`decopin docs` は `app/` を Markdown のリファレンスにします。すべてのコマンドと、その呼び出し方、そして使用例を宣言したコマンドについては実際に何を出力するかが載ります。使用例はコマンドの隣の `example.tsx` で宣言します:',
    'Each entry is the argv you would type after the command name, plus an optional one-line `description`. Nothing else is needed: the name, the arguments and the options are already declared in `cmd.tsx` and `argv.tsx`.':
      '各要素は、コマンド名の後ろに打つ argv と、省略可能な 1 行の `description` です。ほかには何も要りません。名前・引数・オプションはすでに `cmd.tsx` と `argv.tsx` で宣言されています。',
    '## Generating the document': '## ドキュメントを生成する',
    'Commands without an `example.tsx` are documented but **never executed**. Generating a document should not be a way to trigger side effects, so only what you declared is run.':
      '`example.tsx` の無いコマンドもドキュメントには載りますが、**実行は一切されません**。ドキュメントの生成が副作用を引き起こす手段になってはいけないので、実行するのは宣言したものだけです。',
    '## Failing examples': '## 失敗する使用例',
    'An example that exits non-zero is not an error in the generator. Its exit code and output are written into the document as a failure, and the rest of the document is produced as usual — a stale example is easier to notice when it is visible in the docs than when it stops the build.':
      '0 以外で終了する使用例は、生成器のエラーにはなりません。その終了コードと出力が失敗としてドキュメントに書き込まれ、残りは通常どおり生成されます。古くなった使用例は、ビルドを止めるよりもドキュメント上に見えているほうが気づきやすいからです。',
  },
} satisfies PageTranslation;
