import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: '部分再描画 (PPR)',
  description:
    '既定では静的。<Dynamic> で、時間とともに描き直す領域を選んで有効にします。',
  blocks: {
    'Output is static by default. When part of it should update over time, a progress display, a step counter, opt in with `<Dynamic>`. Time is passed as a stream of values: hand it an async generator, and render a frame from the latest value.':
      '出力は既定では静的です。進捗表示やステップのカウンターのように、一部を時間とともに更新したいときは `<Dynamic>` で有効にします。時間は値のストリームとして渡します。async generator を渡し、最新の値から 1 フレームを描画します。',
    'We call this **Partial Repainting**: the document streams, and dynamic islands repaint in place. It is the CLI counterpart of Next.js Partial Prerendering, same acronym, same "static by default, dynamic opt-in" stance, but a terminal has no build-time render, and the island is redrawn many times rather than filled once, so the P stands for repainting.':
      'これを **部分再描画 (Partial Repainting)** と呼んでいます。文書はストリームとして流れ、動的な島だけがその場で描き直されます。Next.js の Partial Prerendering に対応する CLI 版で、略称も同じ、「既定は静的、動的は選んで有効にする」という立場も同じです。ただし端末にはビルド時の描画が無く、島は一度埋めるのではなく何度も描き直されるので、P は再描画 (repainting) の P です。',
    '## How the document streams': '## 文書の流れ方',
    'The document streams top to bottom: static parts flush as soon as they are reached, the `<Dynamic>` region repaints in place until its source is exhausted, then the last frame stays put and the rest of the document follows. `interval` (ms) repaints even without a new value, for frames that read the clock.':
      '文書は上から下へ流れます。静的な部分はたどり着いた時点ですぐに書き出され、`<Dynamic>` の領域はソースが尽きるまでその場で描き直されます。そのあと最後のフレームがそのまま残り、文書の残りが続きます。`interval` (ミリ秒) を指定すると、新しい値が無くても描き直します。時計を読むフレーム向けです。',
    '## Cancelling the source': '## ソースを中断する',
    "Pass a function instead of an iterable to receive the island's `AbortSignal`. It is called when the island is reached, and the signal is aborted when the island ends: the source settles, a frame throws, or the process receives SIGHUP, SIGINT or SIGTERM while stderr is a TTY. Hand it to `fetch`, `Bun.spawn` or anything else that waits, so a source stuck on a slow call still gets to run its `finally`.":
      'iterable の代わりに関数を渡すと、島の `AbortSignal` を受け取れます。関数は島にたどり着いたときに呼ばれ、島が終わるとシグナルが中断されます。島が終わるのは、ソースが決着したとき、フレームが例外を投げたとき、または stderr が TTY の状態でプロセスが SIGHUP・SIGINT・SIGTERM を受け取ったときです。これを `fetch` や `Bun.spawn` など待ちが発生するものに渡せば、遅い呼び出しで止まっているソースでも `finally` を実行できます。',
    '## Where the region lives': '## 領域はどこに出るか',
    'The region lives on **stderr**, following the Unix convention for progress decoration (like curl and cargo), so `cli deploy | tee log` stays clean: stdout carries only the static document. When stderr is not a TTY (pipes, CI), intermediate frames are skipped entirely and only the final frame is written once.':
      '領域は **stderr** に出ます。進捗の装飾は stderr に、という Unix の慣習 (curl や cargo と同じ) に従っているので、`cli deploy | tee log` はきれいなままです。stdout に流れるのは静的な文書だけです。stderr が TTY でないとき (パイプや CI) は途中のフレームを丸ごと飛ばし、最後のフレームだけを一度書き出します。',
    'While the island is live, frames taller than the terminal are trimmed to fit, keeping the tail (the latest lines) and replacing the dropped head with a single `… (N more lines)` marker. Once the source settles, the final frame is written in full, so the settled output matches what a pipe would receive.':
      '島が生きている間、端末より高いフレームは収まるように切り詰めます。末尾 (最新の行) を残し、落とした先頭は `… (N more lines)` という 1 行の目印に置き換えます。ソースが決着すると最後のフレームを全部書き出すので、決着後の出力はパイプが受け取るものと一致します。',
    '`<Dynamic>` must sit at the top level of the command output, not inside `<Line>`, `<Box>`, `<Columns>`, or `<Indent>`.':
      '`<Dynamic>` はコマンドの出力の最上位に置く必要があり、`<Line>`、`<Box>`、`<Columns>`、`<Indent>` の中には置けません。',
    '## Spinner and ProgressBar': '## Spinner と ProgressBar',
    '`<Spinner>` and `<ProgressBar>` are ordinary inline components, so compose them inside a `<Line>` with anything else. The spinner advances on each repaint rather than reading the clock, which keeps frames a pure function of their input: the same input always renders the same output, and animation falls out of the repaint loop (pair it with `interval`). In static output a spinner simply shows its first frame. Both fall back to ASCII (`|/-\\\\`, `#-`) when the terminal is not UTF-8.':
      '`<Spinner>` と `<ProgressBar>` は普通のインラインコンポーネントなので、`<Line>` の中でほかのものと組み合わせられます。スピナーは時計を読まず、描き直すたびに 1 コマ進みます。そうすることでフレームは入力だけで決まる純粋な関数のままになり、同じ入力からは常に同じ出力が描かれ、アニメーションは描き直しのループから自然に生まれます (`interval` と組み合わせてください)。静的な出力では、スピナーは最初のコマを表示するだけです。端末が UTF-8 でない場合、どちらも ASCII (`|/-\\\\`、`#-`) に切り替わります。',
    'Running it in a terminal: the first and last lines are printed once, and only the line between them is redrawn as each value arrives.':
      '端末で実行するとこうなります。最初と最後の行は一度だけ出力され、その間の行だけが値が届くたびに描き直されます。',
    '![mycli deploy: the progress line repaints in place between two static lines](/assets/ppr/deploy.gif)':
      '![mycli deploy: 2 つの静的な行の間で、進捗の行だけがその場で描き直される](/assets/ppr/deploy.gif)',
    '## Several lines at once': '## 複数行をまとめて描き直す',
    'A frame can be any number of lines. Each new value redraws the whole island, so a list of parallel tasks updates as one block, and whatever follows it waits until the source is done.':
      '1 フレームは何行でもかまいません。新しい値が届くたびに島全体を描き直すので、並行して進むタスクの一覧も 1 つのかたまりとして更新され、その後ろに続く出力はソースが終わるまで待ちます。',
    '![mycli download: three progress bars repaint together, then the summary line follows](/assets/ppr/download.gif)':
      '![mycli download: 3 本のプログレスバーがまとめて描き直され、そのあとにまとめの行が続く](/assets/ppr/download.gif)',
    'Redirecting stdout to a file makes this visible: the progress line still animates in the terminal, while the file receives only the static lines.':
      'stdout をファイルにリダイレクトすると、この違いが目に見えます。進捗の行は端末で動き続け、ファイルには静的な行だけが書き込まれます。',
    '![mycli deploy > deploy.log: the progress stays on screen, and deploy.log holds only the two static lines](/assets/ppr/redirect.gif)':
      '![mycli deploy > deploy.log: 進捗は画面に残り、deploy.log には 2 つの静的な行だけが入る](/assets/ppr/redirect.gif)',
  },
} satisfies PageTranslation;
