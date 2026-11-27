import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'stdin.tsx',
  description:
    'stdin.tsx の無いコマンドは標準入力に一切触れません。読むコマンドは、入力が何かを宣言します。',
  blocks: {
    '**A command without `stdin.tsx` never touches stdin.** The most common CLI accident, running a command in a terminal and having it hang on input you did not know it wanted, cannot happen by construction.':
      '**`stdin.tsx` の無いコマンドは標準入力に一切触れません。** 端末でコマンドを実行したら、求められているとは知らなかった入力待ちで止まってしまう。CLI でいちばんよくあるこの事故は、仕組みの上で起こり得ません。',
    '## Modes': '## モード',
    '| `mode` | What the command receives |\n| --- | --- |\n| `text` | `string` (the whole input). `trim` drops the trailing newline |\n| `lines` | `string[]` (split on newlines) |\n| `json` | the type you declared in children, otherwise `unknown` |':
      '| `mode`  | コマンドが受け取るもの                                   |\n| ------- | -------------------------------------------------------- |\n| `text`  | `string` (入力全体)。`trim` を付けると末尾の改行を落とす |\n| `lines` | `string[]` (改行で分割)                                  |\n| `json`  | 子要素で宣言した型。無ければ `unknown`                   |',
    '## Optional and required': '## 省略可能と必須',
    'Without `required`, a command run in a terminal receives `undefined`, and the type says `| undefined`, so code that forgets to handle it does not compile.':
      '`required` が無いと、端末で実行したコマンドは `undefined` を受け取り、型も `| undefined` になります。扱い忘れたコードはコンパイルが通りません。',
    'With `required`, a run in a terminal without a pipe is a usage error (exit 2) instead of a hang. An empty pipe is still input: `count </dev/null` prints `0`.':
      '`required` を付けると、パイプ無しで端末から実行したときは止まる代わりに使い方のエラー (終了コード 2) になります。空のパイプも入力として扱います。`count </dev/null` は `0` を出力します。',
    '## Structured input': '## 構造化された入力',
    '`mode="json"` takes the same `Type.*` children as `argv.tsx`, so structured input gets the same treatment as arguments: validated before the command runs, and typed from the declaration.':
      '`mode="json"` は `argv.tsx` と同じ `Type.*` の子要素を受け取ります。構造化された入力も引数と同じ扱いになり、コマンドの実行前に検証され、宣言から型が付きます。',
    "Input that does not match fails before the command runs, through the same `error.tsx` chain as everything else, with `error.kind === 'stdin'`.":
      "合わない入力はコマンドが動く前に失敗し、ほかと同じ `error.tsx` の連鎖を `error.kind === 'stdin'` で通ります。",
    '## Visible in --help': '## --help にも出る',
    'An [MCP tool](/guides/mcp/) built from a command with `stdin.tsx` gains a `stdin` argument, so an agent can pass the input the pipe would have carried.':
      '`stdin.tsx` を持つコマンドから作られた [MCP ツール](/guides/mcp/) には `stdin` 引数が増えます。パイプで渡すはずだった入力を、エージェントが渡せるようになります。',
  },
} satisfies PageTranslation;
