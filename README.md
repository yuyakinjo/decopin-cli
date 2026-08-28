# decopin-cli

Next.js のようなファイル規約で CLI を書くフレームワーク。TypeScript + Bun。

シェルの 4 つの口が、そのままファイル名になります。

| ファイル      | シェルでの意味     | 必須 |
| ------------- | ------------------ | ---- |
| `command.tsx` | stdout (fd 1)      | 必須 |
| `argv.tsx`    | コマンドライン引数 | 任意 |
| `stdin.tsx`   | 標準入力 (fd 0)    | 任意 |
| `error.tsx`   | stderr (fd 2)      | 任意 |

出力は JSX で書きます。React には依存していません (自前の軽量レンダラー)。

```tsx
// app/hello/command.tsx
import { Line, Text, type CommandProps } from 'decopin-cli';

export default function Command({ args, options }: CommandProps<'hello'>) {
  return (
    <Line>
      <Text bold color="green">
        hello, {args.name}
      </Text>
    </Line>
  );
}
```

```sh
$ bun run build
$ ./dist/index.js hello world
hello, world
```

## セットアップ

```sh
bun add decopin-cli
```

`tsconfig.json` に JSX の設定が必要です。**これが無いと React を探しに行って失敗します**
(`decopin build` が警告します)。

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "decopin-cli/jsx",
    "allowImportingTsExtensions": true
  },
  "include": ["app/**/*", ".decopin/types.d.ts"]
}
```

```sh
bunx decopin build   # app/ を走査して dist/index.js を作る
bunx decopin dev     # app/ を見張って型を作り直す (バンドルはしない)
```

## 引数を宣言する

`argv.tsx` に書いた宣言が、検証・`--help`・**型**の 3 つすべての元になります。
バリデーションライブラリの書き方を覚える必要はありません。

```tsx
// app/hello/argv.tsx
import { Arg, Argv, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv description="Greet someone.">
      {/* 制約が無い型は短縮形で書ける */}
      <Arg
        name="name"
        type="string"
        default="world"
        description="who to greet"
      />
      <Option
        name="loud"
        alias="l"
        type="boolean"
        default={false}
        description="shout it"
      />

      {/* 制約が要るときは children で型を組む */}
      <Option name="times" alias="t" default={1} description="repeat count">
        <Type.Number min={1} max={5} integer />
      </Option>
      <Option name="style" default="plain" description="how to decorate">
        <Type.Enum values={['plain', 'bold', 'rainbow']} />
      </Option>
    </Argv>
  );
}
```

型が再帰する場合は入れ子がそのまま効きます。

```tsx
// app/user/list/argv.tsx (抜粋)
<Option name="tag" description="filter by tag (repeatable)">
  <Type.Array>
    <Type.String minLength={1} />
  </Type.Array>
</Option>
```

**型と「存在」を階層で分けます。**

| 何を決めるか          | どこに書くか                                           |
| --------------------- | ------------------------------------------------------ |
| 値の型と制約          | children (`Type.*`) または `type` 短縮形               |
| 省略できるか / 既定値 | `<Arg>` / `<Option>` の props (`required` / `default`) |

`required` と `default` は同時に指定できません (どちらも無ければ省略可能)。

宣言すると型が届きます。

```tsx
import type { CommandProps } from 'decopin-cli';

export default function Command({ args, options }: CommandProps<'hello'>) {
  args.name; // string
  options.times; // number
  options.style; // "plain" | "bold" | "rainbow"
  return null;
}
```

`--help` も宣言から作られます。

```sh
$ ./dist/index.js hello --help
Usage: decopin-cli hello [name] [options]

Greet someone.

Arguments:
  name                              who to greet (default: "world")

Options:
  -l, --loud                        shout it (default: false)
  -t, --times <number>              repeat count (default: 1)
      --style <plain|bold|rainbow>  how to decorate (default: "plain")
  -h, --help                        show this help
```

## 標準入力を読む

`stdin.tsx` が**無いコマンドは stdin に一切触りません**。端末で実行したときに
入力待ちでフリーズする、という事故が構造的に起きません。

```tsx
// app/count/stdin.tsx
import { Stdin } from 'decopin-cli';

export default function DefineStdin() {
  return <Stdin mode="lines" required />;
}
```

| `mode`  | 受け取る型                                   |
| ------- | -------------------------------------------- |
| `text`  | `string` (全文)。`trim` で末尾の改行を落とす |
| `lines` | `string[]` (改行で分割)                      |
| `json`  | children で宣言した型、または `unknown`      |

`required` を付けなければ、端末で実行したときは `undefined` が渡ります (型にも
`| undefined` が付きます)。

```sh
$ printf 'a\nb\n\nc\n' | ./dist/index.js count
4
```

## エラーを出す

`error.tsx` は**近いディレクトリから順に**探されます。

```
app/user/create/error.tsx   ← 自分のディレクトリ (最優先)
app/user/error.tsx          ← 親を順にさかのぼる
app/global-error.tsx        ← 最後の受け皿
組み込みの既定表示           ← どれも無い / どれも失敗した
```

```tsx
// app/user/error.tsx
import { Line, Text, type ErrorProps } from 'decopin-cli';

export default function UserError({ error }: ErrorProps) {
  return (
    <Line>
      <Text color="red">user: </Text>
      {error.issues[0] ?? error.message}
    </Line>
  );
}
```

出力は既定で stderr に行きます。終了コードは `error.kind` から決まりますが、
`<Exit code={n} />` で上書きできます。

| コード | 意味                                                                       |
| ------ | -------------------------------------------------------------------------- |
| 0      | 成功                                                                       |
| 1      | 実行時エラー (`command.tsx` 内の throw)                                    |
| 2      | 使い方の誤り (引数の検証失敗 / 未知のコマンド / env 不足 / stdin 必須違反) |
| 130    | Ctrl+C                                                                     |

## そのほかの規約

| ファイル         | 役割                                        |
| ---------------- | ------------------------------------------- |
| `layout.tsx`     | 出力を包む。上位ディレクトリから継承される  |
| `middleware.tsx` | 実行を包む。`next()` を呼ぶまで中は走らない |
| `help.tsx`       | `--help` の上書き。ディレクトリ単位         |
| `not-found.tsx`  | 未知のコマンドの表示                        |
| `env.tsx`        | 環境変数の宣言。起動時に一度だけ検証される  |
| `version.tsx`    | `--version` の内容                          |

```tsx
// app/user/middleware.tsx — next は「呼ぶまで走らない関数」
import { Line, Stderr, Text, type MiddlewareProps } from 'decopin-cli';

export default async function Middleware({ next, options }: MiddlewareProps) {
  const started = performance.now();
  const output = await next();
  if (options.verbose !== true) return output;
  return (
    <>
      {output}
      <Stderr>
        <Line>
          <Text dim>took {Math.round(performance.now() - started)}ms</Text>
        </Line>
      </Stderr>
    </>
  );
}
```

`_` で始まるディレクトリはコマンドになりません (共有コードの置き場)。

## サブコマンド

ディレクトリの階層がそのままサブコマンドです。`command.tsx` を持たない
ディレクトリは「グループ」として扱われ、配下の一覧を出します。

```
app/user/list/command.tsx     → cli user list
app/user/import/command.tsx   → cli user import
```

```sh
$ ./dist/index.js user
Usage: decopin-cli user <command> [options]

Commands:
  import
  list

Run "decopin-cli user <command> --help" for details.
```

明示的に `--help` を求めたときは stdout に exit 0 で、コマンドが確定しないまま
終わったときは stderr に exit 2 で出ます。

## 出力コンポーネント

```tsx
<Line>1 行 (末尾に改行が付く)</Line>
<Text bold dim italic underline color="green" bg="#333">
  装飾
</Text>
<Br />
<Stdout>
  <Line>ここは stdout</Line>
</Stdout>
<Stderr>
  <Line>ここは stderr</Line>
</Stderr>
<Exit code={2} />
```

```tsx
<Indent by={2}>
  <Line>字下げ</Line>
</Indent>
<Box border="round" title="summary">
  <Line>罫線で囲む</Line>
</Box>
<Columns gap={4}>
  <Line>左の列</Line>
  <Line>右の列</Line>
</Columns>
<Success>ok</Success>
<Warn>careful</Warn>
<Info>fyi</Info>
<Danger>failed</Danger>
<List items={['a', 'b']} ordered />
<Table
  columns={['NAME', 'SCORE']}
  rows={[['alice', 42]]}
  align={['left', 'right']}
/>
<KeyValue data={{ version: '0.1.0', routes: 6 }} />
<Json value={{ ok: true }} />
<Line>
  <Link href="https://example.com">docs</Link>
</Line>
```

日本語や絵文字の**表示幅**を数えるので、罫線や表がずれません。

```
╭─ summary ──────────────────────╮
│ decopin-cli v0.1.0             │
│ 日本語も桁がずれない           │
╰────────────────────────────────╯
```

色は自動で落ちます。パイプ・リダイレクト時、`NO_COLOR`、`--no-color`、
`TERM=dumb` のいずれかで装飾なしになります (`FORCE_COLOR` で強制できます)。
`<Line>` は自動で折り返しません (パイプ先の行単位の処理を壊さないため)。

## 予約されているオプション

`--help` / `-h` / `--version` / `--no-color` の 4 つはフレームワークが処理します。
`argv.tsx` で同じ名前を宣言するとビルドエラーになります。

## 動くサンプル

[`app/`](app/) がそのままサンプルです。ビルドとテストで常に検証されています。

| コマンド                             | 見どころ                                                             |
| ------------------------------------ | -------------------------------------------------------------------- |
| [`app/hello`](app/hello)             | 位置引数・オプション・enum                                           |
| [`app/count`](app/count)             | `stdin.tsx` (lines)、`help.tsx` の上書き、boolean alias の束ね       |
| [`app/upper`](app/upper)             | 任意の stdin (端末なら `undefined`)                                  |
| [`app/user`](app/user)               | サブコマンド、`layout.tsx`、`middleware.tsx`、継承される `error.tsx` |
| [`app/user/import`](app/user/import) | `mode="json"` + `Type.Object`                                        |
| [`app/config`](app/config)           | `env.tsx` の値を使う                                                 |
| [`app/crash`](app/crash)             | `error.tsx` と `<Exit>`                                              |

## 設計の理由

なぜそうなっているかは [docs/decisions.md](docs/decisions.md) にあります
(なぜ Ink を使わないか、なぜ型をビルド時に生成するか、なぜ middleware は
`children` でなく `next` か、など)。

挙動の約束は [`test/contract/`](test/contract) にテーブル駆動テストとして置いて
あります。仕様書は持ちません — 動かないドキュメントは実装とずれるためです。

決定が守られているかは [`test/docs/decisions.test.ts`](test/docs/decisions.test.ts)
が検査します (ADR ごとに lint / test / manual の守り方を持ち、ADR を足すと
守り方を決めるまで落ちます)。参照切れは
[`test/docs/references.test.ts`](test/docs/references.test.ts) が検出します。

## 開発

```sh
bun run ci            # build → typecheck / test / lint / format を並列で
bun run bench         # 起動時間
bun run format        # 整形する (ci は --check だけ)
```

`bun run ci` は CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) が
回すものと同じです。

## ライセンス

MIT
