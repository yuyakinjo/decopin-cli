import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'data.tsx と output.tsx',
  description:
    '計算と表示を分ければ --json がタダで手に入ります。返すものの形も宣言できます。',
  blocks: {
    "A command can split in two: `data.tsx` computes, `cmd.tsx` displays. The return value of `data.tsx` arrives as the `data` prop, fully typed, with no annotation needed, because the generated types read it back through TypeScript's own inference.":
      'コマンドは 2 つに分けられます。`data.tsx` が計算し、`cmd.tsx` が表示します。`data.tsx` の戻り値は `data` prop として届き、注釈を書かなくても完全に型が付きます。生成される型が TypeScript 自身の推論を通して読み戻すからです。',
    'Splitting buys you `--json`, which is reserved by the framework: it skips the view and prints what `data.tsx` returned.':
      '分けると `--json` が使えるようになります。これはフレームワークの予約オプションで、ビューを飛ばして `data.tsx` の戻り値を出力します。',
    '## Declaring the shape with output.tsx': '## output.tsx で形を宣言する',
    '`output.tsx` declares what `data.tsx` promises. When present it becomes the source of truth: the `data` prop is typed from the declaration rather than inferred, and the value is checked at runtime before anything is displayed or printed.':
      '`output.tsx` は `data.tsx` が約束するものを宣言します。これがあると、それが正となります。`data` prop の型は推論ではなく宣言から付き、値は表示や出力の前に実行時に検査されます。',
    'Checking data your own code produced is worth it when it did not really come from your code: `return (await res.json()) as User[]` type-checks whether or not the response matches. `output.tsx` is the one place that boundary gets examined. Commands without one keep the inferred type and no check. For awkward shapes, pass a valibot schema instead: `<Output schema={v.object(…)} />`.':
      '自分のコードが作ったデータを検査する価値があるのは、それが実は自分のコードから来ていないときです。`return (await res.json()) as User[]` は、レスポンスが合っていてもいなくても型検査を通ります。`output.tsx` は、その境界が調べられる唯一の場所です。`output.tsx` の無いコマンドは推論された型のままで、検査もされません。扱いにくい形なら、代わりに valibot のスキーマを渡せます: `<Output schema={v.object(…)} />`。',
    "The declaration also becomes the `outputSchema` of the command's [MCP tool](/guides/mcp/).":
      'この宣言は、コマンドの [MCP ツール](/guides/mcp/) の `outputSchema` にもなります。',
    '## DataResult: the declaration, checked while you type':
      '## DataResult: 入力中に検査される宣言',
    'With an `output.tsx` in place, `data.tsx` can name what it returns. Then a value that disagrees with the declaration fails to type-check, before the runtime check ever runs:':
      '`output.tsx` があれば、`data.tsx` は返すものの型を名指しできます。すると宣言と食い違う値は、実行時の検査を待たずに型検査で落ちます:',
    "`decopin dev` writes that annotation for you. It is added only when the command has an `output.tsx`: without one, the `data` prop's type is inferred from this function's return value, so annotating it here would make the type refer to itself. Before `decopin build` has generated types, `DataResult<'…'>` is `unknown`, so a fresh checkout still type-checks.":
      "この注釈は `decopin dev` が書いてくれます。付けるのはコマンドに `output.tsx` があるときだけです。無い場合、`data` prop の型はこの関数の戻り値から推論されるので、ここに注釈を付けると型が自分自身を参照してしまいます。`decopin build` が型を生成する前は `DataResult<'…'>` は `unknown` なので、clone した直後でも型検査は通ります。",
    '## What --json refuses': '## --json が拒むもの',
    '`--json` refuses to print data that would not survive the round trip, and names the path rather than letting it break quietly:':
      '`--json` は、往復で壊れてしまうデータの出力を拒み、黙って壊す代わりにそのパスを示します:',
    '`JSON.stringify` drops functions and `undefined`, turns `Map` and `Set` into `{}`, and turns `NaN` into `null`, all without complaining. `Date` and `Temporal` values become strings that the declared type never mentions. Export plain data, or convert at the edge (`when: when.toISOString()`). The `JsonValue` type is exported if you would rather assert it yourself with `satisfies`.':
      '`JSON.stringify` は関数と `undefined` を落とし、`Map` と `Set` を `{}` に、`NaN` を `null` に変えますが、どれも何も言わずに行います。`Date` や `Temporal` の値は、宣言した型のどこにも出てこない文字列になります。素のデータを export するか、境界で変換してください (`when: when.toISOString()`)。自分で `satisfies` を使って確かめたい場合のために、`JsonValue` 型も export しています。',
    '## Failures under --json': '## --json での失敗',
    'When a command fails under `--json`, the failure is structured too, on stderr, with stdout left empty:':
      '`--json` の下でコマンドが失敗すると、失敗も構造化されて stderr に出ます。stdout は空のままです:',
    'Asking for JSON and getting a human-formatted error back would break the parser on the other end, so `error.tsx` is skipped here for the same reason the view is. `code` is what a caller should branch on: messages get reworded, categories do not. `exitCode` is repeated in the body because a caller reading through a pipe cannot see `$?` (in `cmd | jq`, that belongs to jq).':
      'JSON を求めたのに人間向けのエラーが返ってくると、受け取る側のパーサーが壊れます。そのため、ビューを飛ばすのと同じ理由で、ここでは `error.tsx` も飛ばします。呼び出し側が分岐に使うべきなのは `code` です。メッセージの言い回しは変わっても、分類は変わりません。`exitCode` を本文にも入れているのは、パイプ越しに読む呼び出し側からは `$?` が見えないためです (`cmd | jq` での `$?` は jq のものです)。',
    '## Piping does not switch to JSON': '## パイプでは JSON に切り替わらない',
    'Dropping colour when stdout is not a terminal adjusts presentation; changing the output _format_ would break `cli stats | grep README`, so it happens only when asked. A command without a `data.tsx` exits 2 on `--json` and tells you where to put the file.':
      'stdout が端末でないときに色を落とすのは見た目の調整です。出力の _形式_ を変えてしまうと `cli stats | grep README` が壊れるので、形式が変わるのは求められたときだけです。`data.tsx` の無いコマンドは `--json` で終了コード 2 を返し、どこにファイルを置けばよいかを伝えます。',
  },
} satisfies PageTranslation;
