import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'error.tsx',
  description:
    '失敗したときのビュー。いちばん近いディレクトリから外側へと探します。',
  blocks: {
    '`error.tsx` is looked up **from the closest directory outward**.':
      '`error.tsx` は **いちばん近いディレクトリから外側へ** と探します。',
    'Errors go to stderr by default. The exit code follows `error.kind`, and `<Exit code={n} />` overrides it.':
      'エラーは既定では stderr に出ます。終了コードは `error.kind` で決まり、`<Exit code={n} />` で上書きできます。',
    '## What error.tsx receives': '## error.tsx が受け取るもの',
    'The framework wraps whatever was thrown into a `CliError` and keeps the original on `error.cause`, so `error.tsx` can read it.':
      'フレームワークは投げられたものを何でも `CliError` に包み、元の値を `error.cause` に残すので、`error.tsx` から読めます。',
    '| Field | What it is |\n| --- | --- |\n| `error.kind` | `validation` `stdin` `env` `usage` `auth` `missing-tool` `runtime` `unknown` |\n| `error.message` | the headline |\n| `error.issues` | one line per problem, for validation failures |\n| `error.hints` | the commands that fix it (see [Setup errors](/guides/setup-errors/)) |\n| `error.cause` | what was originally thrown |\n| `exitCode` | what the process will exit with, unless `<Exit>` says otherwise |':
      '| フィールド      | 中身                                                                         |\n| --------------- | ---------------------------------------------------------------------------- |\n| `error.kind`    | `validation` `stdin` `env` `usage` `auth` `missing-tool` `runtime` `unknown` |\n| `error.message` | 見出しとなる一文                                                             |\n| `error.issues`  | 検証の失敗で、問題ごとに 1 行                                                |\n| `error.hints`   | 直すためのコマンド ([セットアップのエラー](/guides/setup-errors/) を参照)    |\n| `error.cause`   | もともと投げられたもの                                                       |\n| `exitCode`      | `<Exit>` で変えない限り、プロセスが終了するときのコード                      |',
    '## Debugging': '## デバッグ',
    'The default view prints only the message and hints. Set `DECOPIN_DEBUG=1` to append the `cause` chain with stack traces after the error view (or as `error.trace` under `--json`). It is an environment variable rather than a flag so that `--verbose` and `--debug` stay free for your own options.':
      '既定のビューはメッセージとヒントだけを出します。`DECOPIN_DEBUG=1` を設定すると、エラービューの後ろに `cause` の連鎖をスタックトレース付きで足します (`--json` では `error.trace` として出します)。フラグではなく環境変数にしているのは、`--verbose` や `--debug` を自分のオプションのために空けておくためです。',
    '## Exit codes': '## 終了コード',
    '| Code | Meaning |\n| --- | --- |\n| 0 | success |\n| 1 | runtime error (a throw inside `cmd.tsx`) |\n| 2 | usage error (validation, unknown command, missing env, missing stdin) |\n| 130 | Ctrl+C |':
      '| コード | 意味                                                                  |\n| ------ | --------------------------------------------------------------------- |\n| 0      | 成功                                                                  |\n| 1      | 実行時エラー (`cmd.tsx` の中での throw)                               |\n| 2      | 使い方のエラー (検証、未知のコマンド、環境変数の不足、標準入力の不足) |\n| 130    | Ctrl+C                                                                |',
    '## Under --json': '## --json のとき',
    '`error.tsx` is skipped under `--json`, and the failure is printed as structured data on stderr instead. See [Failures under --json](/conventions/data/#failures-under---json).':
      '`--json` では `error.tsx` を飛ばし、代わりに失敗を構造化されたデータとして stderr に出します。[--json での失敗](/conventions/data/#failures-under---json) を参照してください。',
  },
} satisfies PageTranslation;
