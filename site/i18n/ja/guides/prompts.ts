import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'プロンプト',
  description:
    '尋ねるのは端末でだけ。それ以外の場所では、代わりに機械へ指示を返します。',
  blocks: {
    '`choose()` lets a command ask for one of a few values. It talks to the terminal only: when stdin and stderr are both a TTY it draws the list on stderr and returns the pick, typed as the literal union of what you passed. Anywhere else (a pipe, an agent) it fails with exit 2 and the `hint`, so the same command asks a person and instructs a machine:':
      '`choose()` を使うと、コマンドがいくつかの値のうちの 1 つを尋ねられます。話しかける相手は端末だけです。stdin と stderr がどちらも TTY のときは stderr に一覧を描いて選ばれた値を返し、その型は渡した値のリテラルの union になります。それ以外の場所 (パイプやエージェント) では終了コード 2 と `hint` で失敗するので、同じコマンドが人には尋ね、機械には指示を返します:',
    'Typing filters the list (case-insensitive substring), arrow keys move, Enter selects; Esc or Ctrl+C exits with 130 and prints nothing. Long lists show a window around the selection (`window`, default 10). stdout is never touched, so `deploy web | cat` and `deploy | cat` both behave.':
      '文字を打つと一覧が絞り込まれ (大文字小文字を区別しない部分一致)、矢印キーで移動し、Enter で選びます。Esc か Ctrl+C を押すと何も出力せずに終了コード 130 で終わります。長い一覧は選択位置の周りだけを表示します (`window`、既定は 10)。stdout には一切触れないので、`deploy web | cat` も `deploy | cat` も正しく動きます。',
    '## ask() and confirm()': '## ask() と confirm()',
    '`ask()` and `confirm()` follow the same rules for a typed answer and a yes/no:':
      '`ask()` と `confirm()` は、入力した答えと yes/no について同じ規則に従います:',
    '## Why not read stdin': '## なぜ標準入力を読まないのか',
    'A prompt that read stdin would conflict with [`stdin.tsx`](/conventions/stdin/) and would silently consume piped data. Prompts use the terminal device directly, which is also what makes the "is anyone there?" check reliable.':
      '標準入力を読むプロンプトは [`stdin.tsx`](/conventions/stdin/) とぶつかり、パイプで渡されたデータを黙って消費してしまいます。プロンプトは端末デバイスを直接使います。「誰かいるか」の確認が確実になるのもそのためです。',
  },
} satisfies PageTranslation;
