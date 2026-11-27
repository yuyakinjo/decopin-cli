import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'help.tsx と help()',
  description:
    '--help の出力を差し替え、入力を処理できないときは自分で表示します。',
  blocks: {
    '`--help` is generated from `argv.tsx` (and `stdin.tsx`). `help.tsx` lets a command, or a group, add to it or replace it. The generated text arrives as `auto`, so the common case is appending examples:':
      '`--help` は `argv.tsx` (と `stdin.tsx`) から生成されます。`help.tsx` を使うと、コマンドやグループがそこに書き足したり、丸ごと差し替えたりできます。生成されたテキストは `auto` として届くので、よくあるのは使用例を後ろに足す使い方です:',
    '`help.tsx` is per directory, not inherited. A group directory (one without `cmd.tsx`) can have one too, and it decorates the command listing.':
      '`help.tsx` はディレクトリごとのもので、継承はされません。グループのディレクトリ (`cmd.tsx` の無いもの) にも置けて、その場合はコマンドの一覧を装飾します。',
    'Asking for `--help` explicitly prints to stdout and exits 0. Ending up without a command prints to stderr and exits 2.':
      '明示的に `--help` を求めた場合は stdout に出力して終了コード 0 で終わります。コマンドを指定せずに終わった場合は stderr に出力して終了コード 2 で終わります。',
    '## help(): when the input cannot be acted on':
      '## help(): 入力を処理できないとき',
    "`help()` shows this command's usage and stops. It builds the same thing `--help` does, including a `help.tsx` override, but since it was not asked for, it goes to stderr with exit 2, matching how the framework already treats misuse.":
      '`help()` はこのコマンドの使い方を表示して止まります。`help.tsx` による差し替えも含めて `--help` と同じものを組み立てますが、求められたものではないので、フレームワークがすでに誤用を扱うのと同じく、stderr に出して終了コード 2 になります。',
  },
} satisfies PageTranslation;
