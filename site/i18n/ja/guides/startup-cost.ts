import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: '起動コスト',
  description: 'CLI がシェルのエイリアスを置き換えるときに効いてくる数字。',
  blocks: {
    'The point of this framework is replacing shell aliases, so startup is the number that matters. Measured with [hyperfine](https://github.com/sharkdp/hyperfine) on macOS (arm64, Homebrew Bun 1.4.2), using the 12-command `demo/app` at commit `e35f0e0` on September 7, 2026. Like the CI benchmark, each command uses `--shell=none --warmup 20 --runs 50` and `NO_COLOR=1`. `hello world` parses argv, validates it against `argv.tsx`, and renders JSX:':
      'このフレームワークの目的はシェルのエイリアスを置き換えることなので、効いてくる数字は起動時間です。macOS (arm64、Homebrew の Bun 1.4.2) 上で [hyperfine](https://github.com/sharkdp/hyperfine) を使い、2026 年 9 月 7 日のコミット `e35f0e0` 時点の 12 コマンドからなる `demo/app` で計測しました。CI のベンチマークと同じく、各コマンドは `--shell=none --warmup 20 --runs 50` と `NO_COLOR=1` で実行しています。`hello world` は argv を解析し、`argv.tsx` で検証し、JSX を描画します:',
    '| What | Mean ± stddev | Size |\n| --- | --- | --- |\n| `zsh -c "echo hello"` (floor) | 7.8 ± 0.9 ms | — |\n| empty compiled Bun binary (runtime floor) | 9.8 ± 3.7 ms | 62.23 MB |\n| `bun dist/index.js` (unminified) | 20.1 ± 0.7 ms | 204.40 KB |\n| `bun build --compile` | 22.2 ± 1.3 ms | 62.41 MB |\n| `bun build --compile --bytecode` | 19.0 ± 1.1 ms | 62.84 MB |':
      '| 対象                                             | 平均 ± 標準偏差 | サイズ    |\n| ------------------------------------------------ | --------------- | --------- |\n| `zsh -c "echo hello"` (下限)                     | 7.8 ± 0.9 ms    | —         |\n| 空のコンパイル済み Bun バイナリ (実行環境の下限) | 9.8 ± 3.7 ms    | 62.23 MB  |\n| `bun dist/index.js` (非圧縮)                     | 20.1 ± 0.7 ms   | 204.40 KB |\n| `bun build --compile`                            | 22.2 ± 1.3 ms   | 62.41 MB  |\n| `bun build --compile --bytecode`                 | 19.0 ± 1.1 ms   | 62.84 MB  |',
    'Sizes use decimal KB/MB. The runtime-floor sample had statistical outliers; these local results are a snapshot, not a performance guarantee or a controlled comparison with the older seven-command measurements in [issue #52](https://github.com/yuyakinjo/decopin-cli/issues/52). Subtracting the noisy floor gives an approximate framework/app share of 9.2 ms.':
      'サイズは 10 進の KB/MB です。実行環境の下限の計測には統計的な外れ値がありました。これらはローカルでの一時点の結果で、性能の保証でも、[issue #52](https://github.com/yuyakinjo/decopin-cli/issues/52) にある以前の 7 コマンドでの計測との厳密な比較でもありません。ばらつきの大きい下限を差し引くと、フレームワークとアプリの分はおよそ 9.2 ms です。',
    'The runtime accounts for 62.23 MB; this app with bytecode adds about 0.61 MB. Bytecode itself adds 0.43 MB over the compiled app without bytecode and saves about 3.2 ms in this run. It refuses any module with a top-level await, so the generated entry avoids one — see [`src/core/build/codegen.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/src/core/build/codegen.ts).':
      '62.23 MB は実行環境の分で、バイトコード付きのこのアプリが加えるのは約 0.61 MB です。バイトコード自体はバイトコード無しのコンパイル済みアプリより 0.43 MB 大きくなり、今回の計測では約 3.2 ms 速くなりました。バイトコードはトップレベル await を含むモジュールを受け付けないので、生成されるエントリーはそれを避けています。[`src/core/build/codegen.ts`](https://github.com/yuyakinjo/decopin-cli/blob/main/src/core/build/codegen.ts) を参照してください。',
    '`--bytecode-depth=1` measured 19.5 ± 1.8 ms at 62.69 MB: only 0.15 MB smaller, with no demonstrated startup benefit. We keep the default depth. Compiling provides one file with no Bun installation required on the target machine.':
      '`--bytecode-depth=1` は 19.5 ± 1.8 ms、62.69 MB でした。0.15 MB 小さくなるだけで、起動が速くなる効果は確認できなかったので、既定の深さのままにしています。コンパイルすると 1 つのファイルになり、実行先のマシンに Bun をインストールする必要がありません。',
    'To reproduce the app measurements:': 'アプリの計測を再現するには:',
    'The empty-binary floor uses `process.exit(0);` compiled with `--compile --bytecode`. `bun run bench` provides a separate per-command breakdown; CI measures compiled startup and the runtime floor, plus the minified `hello-app` bundle size.':
      '空のバイナリの下限は、`process.exit(0);` を `--compile --bytecode` でコンパイルしたものです。`bun run bench` はコマンドごとの内訳を別に出します。CI はコンパイル済みの起動時間と実行環境の下限、それに圧縮済みの `hello-app` バンドルのサイズを計測しています。',
  },
} satisfies PageTranslation;
