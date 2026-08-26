# decopin-cli 設計仕様 (v1)

Next.js 風のファイル規約で、型安全に CLI を記述するためのフレームワーク。
言語: TypeScript / ランタイム: Bun。

---

## 1. ゴールと非ゴール

### ゴール

- `app/` 配下のディレクトリ構造がそのままサブコマンド階層になる (ファイル規約ベースのルーティング)
- 出力 (stdout) と エラー出力 (stderr) を JSX で宣言的に記述する
- 引数 (argv) と 標準入力 (stdin) を JSX で宣言し、`command.tsx` には検証済みの型付き値だけが届く
- 入力の型宣言も JSX コンポーネント (`Type.*`) で書く。**利用者はバリデーションライブラリ (valibot) の書き方を知らなくてよい**
- ビルド後は単一の `index.js` として配布でき、起動が速い (目標: 10ms 未満)

### 非ゴール (v1 では扱わない)

- 対話的 UI (プロンプト / 選択リスト / スピナー / プログレスバー) — 再描画・raw mode が必要なため v2 以降
- React の hooks / state / 再レンダリング — v1 の出力は「1回描画して終了」
- シェル補完スクリプトの生成 — v2 以降

---

## 2. 決定事項 (ADR)

| #   | 決定                                                           | 理由                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **自作の軽量レンダラー**を使う (Ink は使わない)                | JSX を再帰的に ANSI 文字列へ変換するだけで足りる。Ink は yoga-wasm を含み起動が 100ms 超になる。静的出力なら reconciler は不要                                                                                                                                                              |
| 2   | **argv と stdin をファイルで分離**する                         | stdin は「読むと入力が来るまでブロックする」「実行時に有無が変わる」「一度しか読めない」という argv とは別物の危険を持つ。ファイルの有無で「このコマンドは stdin を読む」を宣言し、宣言がないコマンドは stdin に一切触らない                                                                |
| 3   | ファイル名は **POSIX 用語で統一**                              | `argv.tsx` / `stdin.tsx` / `command.tsx`(stdout) / `error.tsx`(stderr) が シェルの入出力と 1:1 対応する                                                                                                                                                                                     |
| 4   | **v1 は静的出力のみ**                                          | 装飾の表現力に投資し、対話性は後回し。パイプ・リダイレクトとの相性も良い                                                                                                                                                                                                                    |
| 5   | **ビルド時にルート生成**                                       | `app/` をスキャンして route manifest + エントリを生成し `bun build` で単一 `index.js` に。起動最速、配布が単純                                                                                                                                                                              |
| 6   | バリデーションは **valibot**                                   | 軽量 (zod の約 1/10) で tree-shaking が効き、起動時間に有利。Standard Schema 準拠                                                                                                                                                                                                           |
| 7   | **`layout.tsx` を導入**                                        | 上位ディレクトリの layout が子コマンドの出力を包む。共通テーマ/ヘッダを一箇所で定義できる                                                                                                                                                                                                   |
| 8   | `--help` は **argv.tsx から自動生成**、`help.tsx` で任意上書き | スキーマと help の二重管理を防ぐ                                                                                                                                                                                                                                                            |
| 9   | 型は **ビルド時 codegen** で配る                               | JSX 式の型は `JSX.Element` (宣言時) か `any` (未宣言時) に固定され、**コンポーネントの型引数は必ず消える**ことを TypeScript 7.0.2 で実測確認した (§4.8)。よって JSX で型を運ぶ設計は不可能。Next.js の typed routes と同じく、ビルド時に `.decopin/types.d.ts` を生成して配る               |
| 10  | schema は **`Type.*` の children 合成**。valibot は露出しない  | ユーザーが valibot の書き方を覚える必要をなくす。`Type.Array` のように型が再帰する場合に children の入れ子が自然に効く。valibot は内部実装に隔離し、`schema` prop を上級者向けエスケープハッチとしてのみ残す                                                                                |
| 11  | argv 検証は **middleware より前**に行う                        | middleware が検証済みの `args` / `options` を受け取れる方が実用上の価値が大きい (`--verbose` による分岐など)。代償として「引数検証エラーを middleware でロギングする」ことはできず、検証エラーは middleware を通らず `error.tsx` へ直行する                                                 |
| 12  | 配布は **単一ファイル + 「評価のみ」遅延**                     | `bun build` は動的 import を同一ファイルにインライン化するため、「実行されないコマンドを読み込まない」ことは実現できない。トップレベルのパースは全量走り、遅延されるのはモジュール本体の**評価**のみ。真の遅延読込には `--splitting` (複数ファイル配布) が必要だが、v1 は配布の単純さを取る |

---

## 3. ファイル規約

```
app/
  layout.tsx          任意  全コマンドの出力を包む (ルートレイアウト)
  middleware.tsx      任意  全コマンドの前後で走る処理
  env.tsx             任意  環境変数のスキーマ
  version.tsx         任意  --version の内容
  global-error.tsx    任意  どこでも捕まらなかったエラーの最終受け皿

  hello/
    command.tsx       必須  → stdout   コマンド本体。JSX を返す
    argv.tsx          任意  ← argv     引数・オプションのスキーマ
    stdin.tsx         任意  ← stdin    標準入力(パイプ)の読み方
    error.tsx         任意  → stderr   このコマンドのエラー表示
    layout.tsx        任意             このディレクトリ以下を包む
    middleware.tsx    任意             このディレクトリ以下の前後処理
    help.tsx          任意             --help の手動上書き

  user/
    layout.tsx                         `user` 配下 共通の枠
    list/command.tsx  → `cli user list`
    create/
      command.tsx     → `cli user create`
      argv.tsx
      error.tsx
```

**規則**

- ディレクトリ名 = サブコマンド名。ネストがそのまま階層になる
- `command.tsx` を持つディレクトリだけがコマンドとして登録される
- `_` 始まりのディレクトリはルーティング対象外 (共有コンポーネント置き場)
- `[name]` のような動的セグメントは **使わない** — CLI では位置引数 (`argv.tsx` の `<Arg>`) がその役割を担う

---

## 4. 各ファイルの役割と型

### 4.1 `argv.tsx` — コマンドラインからの入力

`argv.tsx` の default export は**コンポーネントを返す関数**。引数・オプションの宣言も、その**型**も JSX で書く。

```tsx
import { Argv, Arg, Option, Type } from 'decopin-cli';

export default function DefineArgv() {
  return (
    <Argv>
      {/* 制約なしの単純な型は type プロパティの短縮形で書ける */}
      <Arg name="name" type="string" required description="挨拶する相手" />
      <Option
        name="loud"
        alias="l"
        type="boolean"
        default={false}
        description="大文字で出力"
      />

      {/* 制約が要るときは children で型を組む */}
      <Option name="count" alias="c" default={1} description="繰り返し回数">
        <Type.Number min={1} max={10} integer />
      </Option>
      <Option name="format" default="json" description="出力形式">
        <Type.Enum values={['json', 'yaml', 'table']} />
      </Option>

      {/* 型が再帰する場合は入れ子がそのまま効く */}
      <Option name="tag" description="タグ (複数指定可)">
        <Type.Array>
          <Type.String minLength={1} />
        </Type.Array>
      </Option>
    </Argv>
  );
}
```

- `<Arg>` は**順序を持つ**位置引数。JSX 上の記述順がそのまま `cli hello Alice` の位置に対応する
- `<Option>` は名前付き (`--loud` / `-l`)。`alias` は 1 文字
- `description` は `--help` の自動生成に使われる
- `command.tsx` には**検証後の値**が渡る
- 検証失敗時は `ValidationError` として `error.tsx` に流れ、終了コードは `2`

**パース規則**

| 入力              | 解釈                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `--name value`    | 値を取るオプション。次のトークンを値として消費                                                   |
| `--name=value`    | 同上 (`=` 区切り)。値が `-` で始まる場合 (負数など) は必ずこちらを使う (`--count=-5`)            |
| `--loud`          | boolean オプション。**存在 = true**。値トークンは消費しない                                      |
| `--loud=false`    | boolean に明示的に値を渡す唯一の形。`--loud false` は「`--loud` + 位置引数 `false`」と解釈される |
| `-l`              | alias。`--loud` と同じ                                                                           |
| `-lv`             | 短フラグの束ね。**boolean の alias のみ**束ねられる。値を取る alias は単独で書く                 |
| `--tag a --tag b` | `Type.Array` のオプションは**繰り返し**で受ける (`['a','b']`)。カンマ区切りは解釈しない          |
| `--`              | 以降のトークンはすべて位置引数として扱う (オプション解釈の打ち切り)                              |
| `--nope` (未宣言) | 未知のオプション → `kind:'validation'`, exit 2                                                   |

- オプションと位置引数の混在は可 (`cli hello --loud Alice`)。順序は位置引数どうしの間でのみ意味を持つ
- boolean 以外のオプションが値なしで終端に現れたら (`cli hello --count`) → exit 2
- `Type.Array` でないオプションの複数回指定は exit 2 (「最後勝ち」にはしない)

**予約フラグ**

`--help` / `-h` / `--version` / `--no-color` はフレームワークが予約する。`argv.tsx` で同名の `name` / `alias` を宣言した場合は**ビルドエラー** (check ステップで検出)。

**型と「存在」を階層で分ける**

| 何を決めるか              | どこに書くか                             | 例                         |
| ------------------------- | ---------------------------------------- | -------------------------- |
| **値の型と制約**          | children (`Type.*`) または `type` 短縮形 | `<Type.Number min={1} />`  |
| **省略できるか / 既定値** | `<Arg>` / `<Option>` の props            | `required` / `default={1}` |

`required` と `default` は相互排他 (両方指定はビルドエラー)。どちらも無ければ「省略可能で既定値なし」= `undefined` が渡る。

「省略可能か」は型ではなく**存在の話**なので、`Type.*` の側には置かない。これにより children は常に「型が 1 つ」になり、順序や不正な組み合わせの曖昧さが構造的に消える。

**なぜコンポーネントなのか**

- 宣言の記述が `command.tsx` / `error.tsx` と同じ JSX に揃い、フレームワーク全体で書き方が 1 つになる
- `--help` は「この JSX ツリーをそのまま usage としてレンダリングする」だけで生成できる (spec と表示の二重管理が消える)
- `_` 配下の共有コンポーネントによる**オプション束の再利用**が自然に書ける

```tsx
// app/_shared/CommonOptions.tsx
export function CommonOptions() {
  return (
    <>
      <Option name="verbose" alias="v" type="boolean" default={false} />
      <Option name="json" type="boolean" default={false} />
    </>
  );
}
// app/hello/argv.tsx
<Argv>
  <Arg name="name" type="string" required />
  <CommonOptions />
</Argv>;
```

**純粋であること (制約)**

`argv.tsx` はビルド時に評価されて型が生成される (§4.8) ため、**実行時の状態に依存してはいけない**:

- 禁止: `process.env` や現在時刻による条件分岐、副作用、非同期処理
- 理由: ビルド時に確定した型と、実行時に実際に受け付ける引数がズレる
- ビルドの `check` ステップで検出して警告する

### 4.2 `stdin.tsx` — 標準入力(パイプ)からの入力

`argv.tsx` と同じく、**コンポーネントを返す関数**として宣言する。

```tsx
import { Stdin, Type } from 'decopin-cli';

export default function DefineStdin() {
  return (
    // mode: 'text' | 'lines' | 'json'
    // required: true なら パイプされていなければ終了コード 2 のエラー
    <Stdin mode="json" required={false}>
      {/* mode="json" のときだけ children で構造を宣言できる (任意) */}
      <Type.Array>
        <Type.Object>
          <Type.Field name="id">
            <Type.Number integer />
          </Type.Field>
        </Type.Object>
      </Type.Array>
    </Stdin>
  );
}
```

| mode    | `command.tsx` が受け取る型                                            |
| ------- | --------------------------------------------------------------------- |
| `text`  | `string` (全文)                                                       |
| `lines` | `string[]` (改行分割、末尾の空行は除去)                               |
| `json`  | `JSON.parse` 結果 (children があれば検証済みの型、無ければ `unknown`) |

`mode="text"` / `mode="lines"` の場合は children を取らない (self-closing)。複数置いても stdin は 1 本しかないため、2 つ以上の `<Stdin>` はビルド時エラーとする。

**安全規則 (重要)**

- `stdin.tsx` が存在しないコマンドは、フレームワークが stdin を**一切読まない** → 端末直叩きでフリーズしない
- `required={false}` で、かつ stdin が端末 (TTY) の場合は読まずに `undefined` を渡す
- 判定は `process.stdin.isTTY` を使う。パイプ (`echo x | cli`) とリダイレクト (`cli < f.txt`) はどちらも非 TTY として扱う

生成される型は `mode` と children から導出され、`required` が `false` なら `| undefined` が付く (§4.8)。

### 4.3 `command.tsx` — 本体 (stdout)

検証済みの入力を**props で受け取るコンポーネント**として書く。

```tsx
import { Text, Line, Success, type CommandProps } from 'decopin-cli';

export default function Command({
  args,
  options,
  stdin,
  env,
}: CommandProps<'hello'>) {
  return (
    <>
      <Line>
        <Text bold>Hello, {args.name}!</Text>
      </Line>
      <Success>done</Success>
    </>
  );
}
```

- **型引数はルート名の文字列リテラル** (`'hello'`, `'user/create'`)。ビルドが生成する `.decopin/types.d.ts` から `args` / `options` / `stdin` / `env` の型が引かれる (§4.8)
- ルート名は生成された `Routes` インターフェースのキーなので、**タイポは型エラーになり、補完も効く**
- props (`CommandProps`) の中身:

```ts
type CommandProps<R extends keyof Routes> = {
  args: Routes[R]['args']; // 位置引数 (検証済み)
  options: Routes[R]['options']; // オプション (検証済み)
  stdin: Routes[R]['stdin']; // stdin.tsx がなければ never
  env: Env; // env.tsx から生成 (なければ {})
  argv: readonly string[]; // 生の argv (エスケープハッチ)
  cwd: string;
};
```

- 戻り値は JSX、または `Promise<JSX>` (async コンポーネント可)
- `null` を返すと何も出力しない (終了コード 0)

### 4.4 `error.tsx` — エラー表示 (stderr)

```tsx
import { Line, Text, type ErrorProps } from 'decopin-cli';

export default function Error({ error, exitCode }: ErrorProps) {
  return (
    <>
      <Line>
        <Text color="red">✖ </Text>
        {error.issues[0] ?? error.message}
      </Line>
      {error.kind === 'validation' ? (
        <Line>
          <Text dim>Run with --help to see the usage</Text>
        </Line>
      ) : null}
    </>
  );
}
```

```ts
type ErrorProps = {
  error: CliError; // kind で場合分けできる
  exitCode: number; // 既定の終了コード
  argv: readonly string[];
  cwd: string;
};

class CliError extends Error {
  kind: 'validation' | 'runtime' | 'stdin' | 'env' | 'unknown';
  exitCode: number;
  /** 検証の失敗など、理由が複数ある場合 (1 件目が主メッセージ) */
  issues: string[];
}
```

- 出力は**既定で stderr** に行く (`command.tsx` の既定は stdout)。中で `<Stdout>` を使えば上書きできる
- 終了コードは `exitCode` の既定値を使うか、`<Exit code={n} />` で上書き
- `async` な `error.tsx` も書ける (レンダラーが待つ)

**フォールバック順**

```
app/user/create/error.tsx   ← 自分のディレクトリ (最優先)
app/user/error.tsx          ← 親を順にさかのぼる
app/error.tsx
app/global-error.tsx        ← 最後の受け皿
組み込みの既定表示           ← どれも無い / どれも失敗した
```

- **表示係が自分で失敗したら、次の候補に進む**。エラーを出そうとして落ちるのが一番困る事故なので、必ず何かが出る
- 全部失敗した場合は、組み込みの表示が元のエラーに加えて「表示係も失敗した」ことを伝える
- `default export` がコンポーネントでない `error.tsx` は飛ばす

**error.tsx を通らないもの**

未知のコマンド (`Unknown command: helo`) とコマンド一覧は、フレームワークのルーターが出すので `error.tsx` / `global-error.tsx` を通らない。ルートが決まっていない時点では「どの `error.tsx` を使うべきか」も決まらないため。

### 4.5 `layout.tsx` — 共通装飾

```tsx
import { Box, type LayoutProps } from 'decopin-cli';

export default function Layout({ children }: LayoutProps) {
  return (
    <Box border="round" title="user">
      {children}
    </Box>
  );
}
```

- 適用順は**外側 = 上位ディレクトリ**。`app/layout.tsx` → `app/user/layout.tsx` → `command.tsx` の出力
- `error.tsx` の出力も layout に包まれる (`export const skipLayout = true` で除外可)

### 4.6 `middleware.tsx` — 前後処理

```tsx
import { type MiddlewareProps } from 'decopin-cli';

export default async function Middleware({
  children,
  options,
}: MiddlewareProps) {
  const started = performance.now();
  const result = await children();
  if (options.verbose)
    process.stderr.write(`took ${performance.now() - started}ms\n`);
  return result;
}
```

- 上位から順に入れ子で実行される (Koa/Hono 型の onion モデル)
- **`args` / `options` / `env` は検証済み**。argv の検証は middleware より前に完了している (§7 / ADR 11)
- **`stdin` は持たない**。stdin の読み取りは middleware の内側 (`children()` の中) で起きるため、middleware 呼び出し時点ではまだ読まれていない。これにより middleware が `children()` を呼ばずに打ち切れば stdin を消費せずに済む
- **`children` は React と違い遅延評価の関数** (`() => Promise<JsxNode>`、従来の `next()` 相当)。呼ぶ前後に処理を挿めるための意図的な例外
- 戻り値を差し替えれば出力を上書きできるが、v1 では非推奨
- `process.stdout.write` を直接呼ぶのも非推奨 (レンダラーの書き出し順と混ざる)

### 4.7 `env.tsx` / `version.tsx` / `help.tsx`

```tsx
// app/env.tsx — 起動時に一度だけ検証。失敗すれば kind:'env' のエラー
import { Env, Var, Type } from 'decopin-cli';

export default function DefineEnv() {
  return (
    <Env>
      <Var name="API_TOKEN" type="string" required />
      <Var name="LOG_LEVEL" default="info">
        <Type.Enum values={['debug', 'info', 'warn', 'error']} />
      </Var>
    </Env>
  );
}
```

```tsx
// app/version.tsx — --version の内容
import { Version } from 'decopin-cli';

export default function DefineVersion() {
  return <Version version="0.1.0" name="mycli" />;
}
```

```tsx
// app/hello/help.tsx — 自動生成を上書きしたいときだけ置く
import { Line, type HelpProps } from 'decopin-cli';

export default function Help({ auto }: HelpProps) {
  return (
    <>
      {auto}
      <Line>例: cli hello Alice --loud</Line>
    </>
  );
}
```

- `auto` は `argv.tsx` の `<Argv>` ツリーから生成された usage の JSX。そのまま差し込むか、無視して全部自前で書くかを選べる
- `<Env>` の子は `<Var>` のみ。`<Var>` は `<Option>` と同じ規則 (型は children か `type` 短縮形、存在は props) に従い、`CommandProps['env']` の型が生成される

---

### 4.7.1 予約されたオプション

以下はフレームワークが自分で処理する。`argv.tsx` で同じ名前・同じ短縮形を宣言すると `DeclarationError` になる。

| 予約            | 意味                                                   |
| --------------- | ------------------------------------------------------ |
| `--help` / `-h` | 使い方を表示して exit 0                                |
| `--version`     | バージョンを表示して exit 0 (`app/version.tsx` が必要) |
| `--no-color`    | 装飾を落とす                                           |

- **予約はこの 4 つだけ**。`-v` / `-V` は予約しない (大文字小文字の違いだけで意味が変わるのは誤操作を誘うため、フレームワークは使わない)
- 予約オプションはコマンドには渡らない。`argv` にも現れない
- `--` より後ろに現れた場合は位置引数として扱う (`cli grep -- --help` は `--help` を検索語として渡せる)

---

### 4.8 型はどう生成されるか (codegen)

**前提となる実測結果**: JSX 式の型は `JSX.Element` (宣言時) か `any` (未宣言時) に固定され、**コンポーネントの型引数は必ず消える**。自作 jsx-runtime で `jsx()` factory の戻り値をジェネリックにしても変わらない。TypeScript 7.0.2 で以下を確認済み:

```tsx
declare function Option<N extends string, T>(p: {
  name: N;
  type: T;
}): Node<{ name: N; value: T }>;
const a = <Option name="loud" type={true as boolean} />;
//    ^? any  (JSX.Element 未宣言時) / JSX.Element (宣言時) — 型引数は消える
```

props 方式でも children 方式でも同じなので、**JSX で型を運ぶ設計は選択肢にならない**。代わりにビルド時に型を生成する。

**生成の流れ**

```
build
 ├ scan      app/ を走査して argv.tsx / stdin.tsx / env.tsx を列挙
 ├ evaluate  それぞれを import して関数を呼び、宣言ノード木を得る
 │           (レンダリングはしない。JSX を "実行して" 木として読む)
 ├ check     required と default の同時指定、Type.* の重複、
 │           argv.tsx の非純粋性 (§4.1) などを検出
 └ emit      .decopin/types.d.ts を生成
```

- **AST 解析ではなく「評価」を選ぶ理由**: `_` 配下の共有コンポーネント (`<CommonOptions />`) を展開できる。AST 静的解析では import 先を追う必要があり、実質的にミニ TS 処理系を書くことになる
- 代償として `argv.tsx` は純粋でなければならない (§4.1)

**生成物の形**

```ts
// .decopin/types.d.ts (生成物・コミットしない)
import 'decopin-cli';

declare module 'decopin-cli' {
  interface Routes {
    hello: {
      args: { name: string };
      options: {
        loud: boolean;
        times: number;
        style: 'plain' | 'bold' | 'rainbow';
      };
      stdin: never;
    };
    'user/list': {
      args: {};
      options: { limit: number; tag?: string[] };
      stdin: never;
    };
  }
}
```

`decopin-cli` 側は空の `interface Routes {}` を持っていて、生成物が **module augmentation** でそれを埋める。`command.tsx` は `CommandProps<'hello'>` でこの型を引く。

```tsx
export default function Command({ args, options }: CommandProps<'hello'>) {
  // args.name    → string
  // options.loud → boolean
}
```

**キーが省略可能になる条件**

| 宣言          | 生成される型                             |
| ------------- | ---------------------------------------- |
| `required`    | `name: T` (必ず存在する)                 |
| `default={x}` | `name: T` (既定値が入るので必ず存在する) |
| どちらも無い  | `name?: T`                               |
| `variadic`    | `name: T[]`                              |

**型が未生成のときのフォールバック**

`Routes` が空 (= まだ `build` / `dev` を通していない) 場合、`CommandProps<R>` は任意のコマンド名を受け付け、`args` / `options` を `Record<string, unknown>` にする。型検査が「コマンド名が存在しない」で真っ赤になるより、緩く通したうえで `decopin dev` を促す方が親切だという判断。

生成済みなら、コマンド名の綴り間違い (`CommandProps<'helo'>`) も型エラーになる。

- `decopin dev` は `app/` を watch して `.decopin/` を作り直す。エディタは 1 回の保存で複数のイベントを出すので、50ms でまとめる
- `.decopin/types.d.ts` を `tsconfig.json` の `include` に入れる必要がある

**`Type.*` から valibot への対応表 (内部実装)**

| JSX                                                                | valibot                                          |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| `<Type.String minLength={1} />`                                    | `v.pipe(v.string(), v.minLength(1))`             |
| `<Type.Number min={1} integer />`                                  | `v.pipe(v.number(), v.integer(), v.minValue(1))` |
| `<Type.Boolean />`                                                 | `v.boolean()`                                    |
| `<Type.Enum values={['a','b']} />`                                 | `v.picklist(['a','b'])`                          |
| `<Type.Array>{T}</Type.Array>`                                     | `v.array(T)`                                     |
| `<Type.Object><Type.Field name="x">{T}</Type.Field></Type.Object>` | `v.object({ x: T })`                             |
| `<Type.OneOf>{A}{B}</Type.OneOf>`                                  | `v.union([A, B])`                                |
| `default={x}` (props)                                              | `v.optional(T, x)`                               |
| `required` なし・`default` なし                                    | `v.optional(T)`                                  |

valibot はこの表の右側にしか現れない。**利用者のコードに valibot が出てくるのは `schema` prop を使う場合だけ**で、それは上級者向けエスケープハッチとして残す。

**入力源ごとの型変換 (coercion)**

argv と env の値は**常に文字列**として届くため、検証の前に文字列からの変換層を挟む。stdin (JSON) は `JSON.parse` が型を持つため変換しない。同じ `Type.*` でも入力源で振る舞いが変わる:

| Type.\*        | argv / env (文字列入力)                                                                 | stdin JSON (型付き入力)        |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------ |
| `Type.String`  | そのまま                                                                                | `string` であることを検証      |
| `Type.Number`  | `Number(x)` で変換。`NaN` / 空文字は exit 2                                             | `number` であることを検証      |
| `Type.Boolean` | argv: 存在 = true (`=true` / `=false` のみ値を解釈)。env: `true` `false` `1` `0` を変換 | `boolean` であることを検証     |
| `Type.Enum`    | 文字列のまま `values` と比較 (v1 の `values` は文字列のみ)                              | 同左                           |
| `Type.Date`    | ISO 8601 文字列を `Date` へ変換。パース不能は exit 2                                    | ISO 文字列を検証して `Date` へ |
| `Type.Array`   | オプションの繰り返しから配列を構成し、要素ごとに変換                                    | JSON 配列を検証                |
| `Type.Object`  | argv / env では使用不可 (**ビルドエラー**)                                              | JSON オブジェクトを検証        |

- 順序は **変換 → 検証**。制約 (`min` など) は変換後の値に対して評価される
- 実装は入力源ごとに valibot のパイプを組み替える (例: argv の number は `v.pipe(v.string(), v.transform(Number), v.number(), ...)`)

**`schema` エスケープハッチの型生成**

`schema` prop に生の valibot スキーマを渡した場合、type-emitter はスキーマオブジェクトを内省して型を出力する。ただし出力できるのは**既知のノード種別のみ**:

- 出力可能: `string` / `number` / `boolean` / `date` / `literal` / `picklist` / `array` / `object` / `optional` / `nullable` / `union`
- それ以外 (`transform` / `custom` / `lazy` など) を含むスキーマは **`unknown` にフォールバック**し、check ステップで警告する
- `<Type.Custom>` は `as` prop で出力する型を文字列で明示する (例: `as="URL"`)。省略時は `unknown`

---

## 5. コンポーネントカタログ

### 5.1 出力先の切り替え (このフレームワークの核)

| コンポーネント      | 役割                                                   |
| ------------------- | ------------------------------------------------------ |
| `<Stdout>`          | 子ツリーを stdout (fd 1) へ。`command.tsx` の既定      |
| `<Stderr>`          | 子ツリーを stderr (fd 2) へ。`error.tsx` の既定        |
| `<Exit code={n} />` | 終了コードを宣言。ツリー内で最後に評価されたものが勝つ |

### 5.1.1 入力宣言 (`argv.tsx` / `stdin.tsx` / `env.tsx` / `version.tsx`)

| コンポーネント | props                                                             | 役割                                 |
| -------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `<Argv>`       | —                                                                 | 引数宣言のルート                     |
| `<Arg>`        | `name` `type` `required` `default` `description` `variadic`       | 位置引数。記述順 = 引数の順          |
| `<Option>`     | `name` `type` `required` `default` `alias` `description` `hidden` | 名前付きオプション (`--name` / `-a`) |
| `<Stdin>`      | `mode` `required`                                                 | 標準入力の読み方 (`stdin.tsx`)       |
| `<Env>`        | —                                                                 | 環境変数宣言のルート (`env.tsx`)     |
| `<Var>`        | `name` `type` `required` `default` `description`                  | 環境変数 1 つ                        |
| `<Version>`    | `version` `name`                                                  | `--version` の内容 (`version.tsx`)   |

- `type` は制約なしの単純な型 (`'string' | 'number' | 'boolean'`) の短縮形。children があれば children が勝つ (両方指定はビルドエラー)
- `schema` prop に valibot スキーマを直接渡すこともできる (上級者向けエスケープハッチ)
- これらは stdout には描画されず、`--help` のレンダリング時のみ usage として出力される

### 5.1.2 型宣言 `Type.*` (入力宣言の children)

| コンポーネント   | props                                           | children                       |
| ---------------- | ----------------------------------------------- | ------------------------------ |
| `<Type.String>`  | `minLength` `maxLength` `pattern` `email` `url` | —                              |
| `<Type.Number>`  | `min` `max` `integer`                           | —                              |
| `<Type.Boolean>` | —                                               | —                              |
| `<Type.Enum>`    | `values`                                        | —                              |
| `<Type.Date>`    | `min` `max`                                     | — (ISO 文字列を `Date` に変換) |
| `<Type.Array>`   | `minItems` `maxItems`                           | 要素の型を 1 つ                |
| `<Type.Object>`  | —                                               | `<Type.Field>` を複数          |
| `<Type.Field>`   | `name` `required` `default`                     | 値の型を 1 つ                  |
| `<Type.OneOf>`   | —                                               | 型を複数 (union)               |
| `<Type.Custom>`  | `validate` `message` `as`                       | — (エスケープハッチ)           |

- `Arg` / `Option` / `Var` / `Stdin` のすべてで同じ `Type.*` を使う。覚えることは 1 系統だけ
- children の型は必ず 1 つ (`Type.Object` / `Type.OneOf` を除く)。2 つ以上はビルドエラー

`command.tsx` の中で警告だけ stderr に出す、が JSX で書ける:

```tsx
<>
  <Line>{result}</Line>
  <Stderr>
    <Warn>3 件スキップしました</Warn>
  </Stderr>
</>
```

### 5.2 テキストと装飾 (インライン)

| コンポーネント | props                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `<Text>`       | `color` `bg` `bold` `dim` `italic` `underline` `strikethrough` `inverse` |
| `<Link>`       | `href` — OSC 8 ハイパーリンク (非対応端末では URL をそのまま表示)        |

`color` は 16 色名 (`'red' | 'green' | ...`) + `'#rrggbb'` を受ける。24bit 非対応端末では最近似の 16 色へ丸める。

### 5.3 レイアウト (ブロック)

| コンポーネント       | 役割                                                     |
| -------------------- | -------------------------------------------------------- |
| `<Line>`             | 1 行。末尾に改行を付ける。子はインラインとして横に連結   |
| `<Br />`             | 空行                                                     |
| `<Indent by={2}>`    | 子ブロック全体を字下げ                                   |
| `<Box border title>` | 罫線で囲む (`'round' \| 'single' \| 'double' \| 'none'`) |
| `<Columns gap>`      | 子を横並びにする (幅は端末幅で分配)                      |

### 5.4 セマンティック (色 + 記号のプリセット)

| コンポーネント | 既定の見た目 |
| -------------- | ------------ |
| `<Success>`    | 緑 `✔`       |
| `<Warn>`       | 黄 `⚠`       |
| `<Info>`       | 青 `ℹ`       |
| `<Danger>`     | 赤 `✖`       |

記号は非 UTF-8 端末では ASCII (`+ ! i x`) にフォールバックする。

### 5.5 データ表示

| コンポーネント                | props                                                    |
| ----------------------------- | -------------------------------------------------------- |
| `<List items ordered bullet>` | 箇条書き                                                 |
| `<Table columns rows align>`  | 列幅を内容から自動計算。端末幅を超える列は省略記号で切る |
| `<KeyValue data align>`       | `key: value` の整列表示                                  |
| `<Json value indent>`         | 構文着色付きの JSON                                      |

---

## 6. レンダラー仕様

### 6.1 パイプライン

```
JSX ツリー
  ↓ (1) 評価: 関数コンポーネントを再帰的に呼ぶ。Promise は await
中間ノード木 (host node: line / text / box / ...)
  ↓ (2) レイアウト: 端末幅を使って折返し・列幅・字下げを解決
セグメント列 [{ fd, text, style }]
  ↓ (3) 直列化: style を ANSI エスケープへ。色を落とす判定はここ
fd ごとの文字列
  ↓ (4) 書き出し: fd ごとに 1 回だけ write
```

- **React 本体に依存しない**。`tsconfig` の `jsxImportSource` を `decopin-cli/jsx` に向け、`jsx()` factory を自作する
- 書き出しは fd ごとに 1 回にまとめる (write のインターリーブ事故を防ぐ)
- stdout と stderr の書き出し順は「stdout → stderr」に固定

### 6.2 色と装飾を落とす条件 (優先順)

1. `FORCE_COLOR` が設定されていれば**常に色を付ける**
2. `NO_COLOR` が設定されていれば色を落とす (no-color.org の規約)
3. `--no-color` フラグがあれば落とす
4. `process.stdout.isTTY` が false (パイプ・リダイレクト) なら落とす
5. `TERM=dumb` なら落とす

stdout と stderr で判定は独立して行う (stdout だけパイプされている場合、stderr には色を残す)。

### 6.3 幅

- `process.stdout.columns` を使い、取得できなければ `80`
- 東アジア文字・絵文字は表示幅 2 として数える (自前の幅計算テーブル)

---

### 6.4 Phase 1 で確定した細部

実装して初めて決める必要が出た点を、決定として残す。

**出力の末尾に改行を 1 つ保証する**

fd ごとの出力が空でなく、末尾が改行でない場合は改行を 1 つ足す。「テキストの行は改行で終わる」という POSIX の慣習に合わせるためで、これが無いとシェルのプロンプトが出力の末尾にくっつく。何も出力しない場合は空文字のまま (改行も出さない)。

**行の中でできないこと**

`<Line>` の内側では以下を禁止し、`RenderError` を投げる。1 行が複数の出力先や複数行にまたがる状態を構造的に作れないようにするため。

| 禁止                    | エラーメッセージ                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `<Line>` の入れ子       | `<Line> を <Line> の中に置けません。行の入れ子はできません`                             |
| `<Br />`                | `<Br /> を <Line> の中に置けません`                                                     |
| `<Stdout>` / `<Stderr>` | `<Stdout> / <Stderr> を <Line> の中で切り替えられません。1 行は 1 つの出力先に属します` |

`<Text>` は装飾だけを担う透過的な存在なので、`<Text>` の中に `<Line>` を置くのは許す (装飾は内側の行に効く)。

**改行は装飾を持たない**

改行セグメントには装飾を付けない。付けると色が次の行に漏れ、パイプで途中を切ったときに端末の色が壊れる。

**装飾はセグメント単位で開いて閉じる**

隣接する同一装飾をまとめる最適化は行わず、セグメントごとに `開始シーケンス + 文字 + リセット` を出す。出力が入力から一意に決まるためテストが読みやすく、Phase 7 で折返しを入れても壊れない。

**`FORCE_COLOR=0` / `FORCE_COLOR=false` は「明示的に落とす」**

§6.2 の優先順 1 の補足。`FORCE_COLOR` が設定されていれば色を付けるが、値が `0` / `false` の場合だけは落とす。既存の CLI ツール群の慣習に合わせたもの。

---

## 7. 実行ライフサイクル

```
1. argv をトークン化し、ルートを解決          → 未知のコマンドなら exit 2
2. --help / --version を割り込み処理           → exit 0
3. env.tsx を検証                              → 失敗: kind:'env', exit 2
4. argv.tsx を検証                             → 失敗: kind:'validation', exit 2
5. middleware を上位から入れ子で開始
6. stdin.tsx があれば読む (TTY 判定)           → 失敗: kind:'stdin', exit 2
7. command.tsx を実行 → JSX ツリー             → throw: kind:'runtime', exit 1
8. layout.tsx で外側から包む
9. レンダリングして fd へ書き出す
10. 終了コードを決めて exit
```

エラーが起きた場合は 7 の位置に `error.tsx` の出力が入り、8 以降は同じ経路を通る。

**検証を middleware より前に置く理由** (ADR 11): middleware が検証済みの `args` / `options` を受け取れるようにするため。副作用として、**ステップ 3-4 で起きたエラー (env / argv 検証失敗) は middleware を通らない**。middleware でのロギングや計測は「コマンドが実際に実行される場合のみ」走ると理解する必要がある。

一方 **stdin の読み取り (6) は middleware の内側**に置く。middleware が `children()` を呼ばずに打ち切った場合、stdin を消費しないで終われる。

### ルート解決の規則

argv の先頭から `command.tsx` を持つディレクトリへ**最長一致**でマッチする。マッチしなかった残りが位置引数・オプションになる。

| 入力                             | 状況                                              | 挙動                                                           |
| -------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `cli hello Alice`                | `app/hello/command.tsx` あり                      | `hello` を実行。`Alice` は位置引数                             |
| `cli` (引数なし)                 | ルートにコマンドなし                              | ルート help (コマンド一覧) を **stderr** へ、exit **2**        |
| `cli user`                       | `app/user/` に `command.tsx` なし・子コマンドあり | グループ help (`user` 配下の一覧) を **stderr** へ、exit **2** |
| `cli --help` / `cli user --help` | 明示的な help 要求                                | 同じ内容を **stdout** へ、exit **0**                           |
| `cli nope`                       | どのルートにもマッチしない                        | 「未知のコマンド」を **stderr** へ、exit **2**                 |

- 原則: **明示的に `--help` を求められたら stdout + exit 0。コマンドが確定しないまま終わったら stderr + exit 2** (使い方の誤り)
- ルート / グループの help は登録済みルートから自動生成する。`app/help.tsx` / `app/user/help.tsx` を置けば上書きできる (`command.tsx` を持たないディレクトリにも `help.tsx` は置ける)

### 終了コード規約

| コード | 意味                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| 0      | 成功                                                                                                                 |
| 1      | 実行時エラー (`command.tsx` 内の throw)                                                                              |
| 2      | **使い方の誤り** — 引数検証失敗 / 未知のコマンド / サブコマンド未指定 / 未知のオプション / env 不足 / stdin 必須違反 |
| 130    | SIGINT (Ctrl+C)                                                                                                      |
| 任意   | `<Exit code={n} />` または `throw new CliError(msg, { exitCode })`                                                   |

`2` を「使い方の誤り」に割り当てるのは POSIX ツールの慣習 (`grep`, `ls` などと同じ)。

---

## 8. ビルド仕様

```
$ bun run decopin build
Found 2 command(s): hello, user/list
Wrote dist/index.js (69.6 KB) in 5ms

$ ./dist/index.js hello
hello, world

$ ./dist/index.js hello Alice --loud
HELLO, ALICE!

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

$ ./dist/index.js hello --times 9; echo "exit=$?"
✖ --times: Invalid value: Expected <=5 but received 9
Run with --help to see the usage
exit=2

$ ./dist/index.js hello --nope; echo "exit=$?"
✖ Unknown option: --nope
Run with --help to see the usage
exit=2
```

**遅延の正確な意味** (ADR 12)

ルートごとに `await import()` を使うが、`bun build` はこれを**同一ファイル内の遅延評価ラッパーにインライン化**する。したがって:

|                      | 単一ファイル (v1 採用) | `--splitting` (複数ファイル) |
| -------------------- | ---------------------- | ---------------------------- |
| トップレベルのパース | **全コマンド分走る**   | 実行するコマンド分のみ       |
| モジュール本体の評価 | 実行するコマンド分のみ | 実行するコマンド分のみ       |
| 配布                 | `index.js` 1 個        | `index.js` + chunk 群        |

「実行されないコマンドのコードを読み込まない」は**不正確**で、正しくは「評価しない」。JavaScriptCore の遅延関数パース (関数本体は最初の呼び出しまでパースしない) により、パース側のコストも実測では小さい見込み。コマンド数が数百規模になり起動 10ms を割れなくなった時点で `--splitting` を再検討する。

- `dev` は `app/` を watch して `.decopin/` を再生成するだけ (実行時スキャンは行わない)。型の更新もここで走る
- `.decopin/` は生成物なので `.gitignore` に入れる。CI では build → typecheck → test の順で流す

---

### 8.1 Phase 2 で確定した細部

**`.tsx` と `.ts` の両方を規約ファイルとして認める**

JSX を使わないコマンド (計算して数値を返すだけ、など) のために `.ts` も許す。両方あれば `.tsx` を優先する。

**`_` と `.` で始まるディレクトリはルーティングの対象外**

`_shared/` のような共有コード置き場に加え、`.git` などが混ざっても走査が壊れないようにする。

**ルートコマンド (`app/command.tsx`) は名前を空文字として扱う**

存在する場合、コマンド名に一致しなかった argv はすべてルートコマンドに渡る (単一コマンドの CLI が書ける)。存在しない場合は未知のコマンドとして exit 2。

**未知のコマンドには候補を出す**

編集距離が「入力したコマンド名の長さの半分」以内なら `もしかして: hello` を出す。候補がなければ利用できるコマンドを列挙する。遠すぎる候補は混乱させるだけなので出さない。

**`--no-color` はフレームワークが argv から取り除く**

コマンドには渡さない。装飾の有無は出力の見た目の話であって、コマンドの引数ではないため。

**`run()` は終了コードを返し、`process.exit` は呼ばない**

`process.exit` を呼ぶのは生成された `entry.ts` だけ。ライフサイクル全体をテストから呼べるようにするためで、書き出し先も差し替えられる。

**decopin 自身の CLI は argv の解析を手で書く**

`decopin build` が `argv.tsx` に依存すると、ビルドする側がビルドされる側の仕組みを必要とする鶏と卵になる。ここだけは手書きのままにする。

---

### 8.2 Phase 3 で確定した細部

**フレームワークが出すメッセージはすべて英語**

`--help` の見出し、エラー文、`decopin build` の出力を英語で統一する。CLI として公開したときにそのまま使えるようにするため。コード内のコメントと本仕様書は日本語のまま。

**argv の書き方**

| 書き方                          | 扱い                                                 |
| ------------------------------- | ---------------------------------------------------- |
| `--name value` / `--name=value` | 値を取るオプション                                   |
| `-a value` / `-a=value`         | 短縮形も同じ                                         |
| `--flag`                        | boolean は値を取らない (次のトークンを食わない)      |
| `--no-flag`                     | boolean を false にする                              |
| `--tag x --tag y`               | 配列型は繰り返しで集める                             |
| `-t 2 -t 4`                     | 配列でない型は**最後の指定が勝つ**                   |
| `--` 以降                       | すべて位置引数                                       |
| `-` 単独                        | 位置引数 (標準入力を指す慣習のため)                  |
| `-abc`                          | **v1 では解釈しない**。未知のオプションとして exit 2 |

**`argv.tsx` が無いコマンドは検証しない**

宣言が無ければ検証も起きず、生の argv が `argv` としてそのまま渡る。「ファイルの有無が機能の有無」という規約 (§3) をそのまま適用したもの。未知のオプションで落ちないので、引数を自分で解釈したいコマンドも書ける。

**検証の誤りは全部集めてから一度に出す**

1 つ直すたびに実行し直す手間を避けるため。1 行目を主メッセージ、残りをヒントとして出し、最後に `Run with --help to see the usage` を添える。

**型変換の失敗と検証の失敗を分ける**

argv は必ず文字列で届くので、まず宣言された型に変換し、その後に valibot で検証する。変換に失敗した場合は valibot に渡さず、`--times: expected a number, received "abc"` のように**何を渡すべきか**を伝える。valibot の `Expected <=5 but received 9` のようなメッセージは、変換が成功した後の制約違反にだけ現れる。

**位置引数の順序**

「必須 → 省略可能」の順でしか宣言できない。省略可能の後ろに必須があると、どの位置に何が来るのか一意に決まらないため。`variadic` は最後の `<Arg>` にだけ付けられる。

**help の細部**

- 表示するオプションが 1 つ以上あるときだけ usage に `[options]` を出す
- `hidden` なオプションは出さない
- 必須の位置引数は `<name>`、省略可能は `[name]`、`variadic` は `<name...>`
- 実行ファイル名は `package.json` の `name` からビルド時に埋め込む (実行時に `process.argv[1]` を推測しない)

---

### 8.3 Phase 3.5 で確定した細部

**`decopin build` は 3 つのファイルを生成する**

| 生成物                | 用途                                   |
| --------------------- | -------------------------------------- |
| `.decopin/types.d.ts` | `Routes` の module augmentation (§4.8) |
| `.decopin/routes.ts`  | ルート表 (動的 import)                 |
| `.decopin/entry.ts`   | エントリポイント                       |

**`decopin dev` は型と routes だけを作り、バンドルはしない**

型の更新が目的なので、バンドルの時間を払わない。実行して確かめたいときは `decopin build` を使う。

**宣言の誤りは 1 件目で止めずに全部集める**

`argv.tsx` を評価する段で失敗したルートだけを落とし、残りは通す。報告は `Invalid declarations:` に続けてファイルごとに 1 行。ビルドし直すたびに 1 つずつ直す手間を避けるため (§8.2 と同じ考え方)。

**`argv.tsx` は絶対パスで import する**

呼び出し元の位置によって解決先が変わらないようにするため。

**型検査には `.decopin/types.d.ts` を含める必要がある**

`tsconfig.json` の `include` に加える。CI では build → typecheck → test の順に流す。

---

### 8.4 Phase 4 で確定した細部

**`error.tsx` は上位ディレクトリから継承される**

そのため scanner は「`command.tsx` を持たないディレクトリ」の規約ファイルも拾う。`app/user/error.tsx` だけを置いて `app/user/` 以下の全コマンドで共有する、という書き方ができる。継承の対象は `error.tsx` / `layout.tsx` / `middleware.tsx` の 3 つ。

**エラー表示の連鎖はビルド時に確定する**

`.decopin/routes.ts` に、ルートごとの `errors: [...]` (近い順) と `export const globalError` を書き出す。実行時にディレクトリを遡らないので、探索のコストは 0。

**組み込みの既定表示だけがヒントを足す**

`Run with --help to see the usage` のような案内は組み込みの表示にだけ付く。`error.tsx` を置いた時点で表示の責任は利用者側に移るので、フレームワークが勝手に行を足さない。

---

## 9. `src/` 内部構成

```
src/
  jsx/           jsx-runtime.ts, jsx-dev-runtime.ts, types.ts (要素と装飾の型)
  components/    host.ts (組み込みコンポーネントの標識), index.ts
                 Phase 1: Text, Line, Br, Stdout, Stderr, Exit
                 Phase 7: Indent, Box, Columns, Success, Warn, Info, Danger,
                          List, Table, KeyValue, Json, Link
  components/input/  Argv, Arg, Option, Stdin, Env, Var, Version (宣言専用ノード)
  components/type/   Type.String / Number / Boolean / Enum / Date / Array /
                     Object / Field / OneOf / Custom (型宣言ノード)
  renderer/      evaluate.ts (1)  layout.ts (2)  ansi.ts (3)  writer.ts (4)
                 render.ts (入口), node.ts (中間ノード), color.ts,
                 capabilities.ts (TTY/NO_COLOR 判定), errors.ts
                 Phase 7: width.ts (東アジア文字の幅計算)
  runtime/       router.ts (ルート解決と候補提示), run.tsx (ライフサイクル),
                 exit.ts (終了コード規約), messages.tsx (既定のエラー表示)
                 Phase 6: stdin-reader.ts
  validation/    type-node → valibot 変換 (§4.8 の対応表), argv パーサ, help 自動生成
                 ※ valibot への依存はこのディレクトリに閉じ込める
  build/         scanner.ts, evaluator.ts (argv.tsx を評価), codegen.ts,
                 type-emitter.ts (types.d.ts), bundler.ts, watch.ts (dev),
                 index.ts (generate / build)
  types/         routes.ts (生成された型の受け皿。Routes / CommandProps)
  cli/           bin.ts (decopin build / dev のエントリ)
```

---

## 10. 最小の動作例 (垂直スライス)

```tsx
// app/hello/argv.tsx
import { Argv, Arg, Option } from 'decopin-cli';
export default function DefineArgv() {
  return (
    <Argv>
      <Arg
        name="name"
        type="string"
        default="world"
        description="挨拶する相手"
      />
      <Option
        name="loud"
        alias="l"
        type="boolean"
        default={false}
        description="大文字で"
      />
    </Argv>
  );
}
```

```tsx
// app/hello/command.tsx
import { Line, Text, type CommandProps } from 'decopin-cli';
export default function Command({ args, options }: CommandProps<'hello'>) {
  return (
    <Line>
      <Text bold color="green">
        {options.loud
          ? `HELLO, ${args.name.toUpperCase()}!`
          : `hello, ${args.name}`}
      </Text>
    </Line>
  );
}
```

```
$ bun run decopin build
   emit .decopin/types.d.ts  →  Routes['hello'] = {
          args: { name: string }, options: { loud: boolean }, stdin: never }
$ bun dist/index.js hello
hello, world
$ bun dist/index.js hello Alice --loud
HELLO, ALICE!
$ bun dist/index.js hello --help
Usage: mycli hello [name] [options]

Arguments:
  name          挨拶する相手 (default: "world")

Options:
  -l, --loud    大文字で
$ bun dist/index.js hello --nope; echo "exit=$?"
✖ 未知のオプション: --nope
exit=2
```

---

## 11. 実装フェーズ

| Phase | 内容                                                            | 完了条件                                                        |
| ----- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 1     | `jsx/` + `renderer/` + `Text` `Line`                            | JSX から期待通りの文字列/ANSI が出ることを `bun test` で検証    |
| 2     | `build/` + `runtime/router`                                     | `app/hello/command.tsx` が `dist/index.js hello` で動く         |
| 3     | `Type.*` + `argv.tsx` + valibot 変換 + help 自動生成            | 位置引数・オプション・alias・`--help`・exit 2                   |
| 3.5   | `build/type-emitter` (`.decopin/types.d.ts` 生成) + `dev` watch | `CommandProps<'hello'>` で `args.name` が `string` に解決される |
| 4     | `error.tsx` / `global-error.tsx` / 終了コード                   | エラー経路のフォールバック順が仕様通り                          |
| 5     | `layout.tsx` / `middleware.tsx`                                 | 入れ子の適用順を検証                                            |
| 6     | `stdin.tsx`                                                     | パイプ有/無/TTY/required の 4 パターン                          |
| 7     | 装飾コンポーネント (`Box` `Table` `List` `Columns`) + 幅計算    | 端末幅 40/80/120 でのスナップショット                           |
| 8     | `env.tsx` / `version.tsx` / 起動時間ベンチ                      | 起動 10ms 未満                                                  |

**Phase 1-4 は完了** (2026-08-27): `src/jsx/` `src/components/` `src/renderer/` と 52 件のテスト。`Text` / `Line` / `Br` / `Stdout` / `Stderr` / `Exit` が動き、`scripts/demo-render.tsx` で実機確認済み。
Phase 2 で `src/build/` `src/runtime/` `src/cli/` を追加し、`bun src/cli/bin.ts build` →
`./dist/index.js hello` が動作 (起動 10ms 未満)。
Phase 3 で `Type.*` / `argv.tsx` / valibot 変換 / `--help` 自動生成を追加。
Phase 3.5 で `.decopin/types.d.ts` の生成と `decopin dev` の watch を追加し、
`CommandProps<'hello'>` から `args.name: string` が引けることを実際の tsc で検証。
Phase 4 で `error.tsx` / `global-error.tsx` のフォールバックと終了コードの上書きを追加。テストは 207 件。

**Phase 1-2 が最小の垂直スライス** — ここが通れば設計の骨格が正しいと確認できる。

---

## 12. 未決 / 要検討

- 型が**古い** (生成済みだが宣言と食い違う) 場合は素直に型エラーになる。未生成のときのフォールバックは実装した (§4.8) が、「古い」と「未生成」は区別できていない。`decopin dev` を回す運用でしのぐ
- 未知のコマンドを `global-error.tsx` で受けられない (§4.4)。ルート未決定の時点では表示係も決まらないため今はこうしているが、「コマンド一覧の見た目を変えたい」という要望が来たら `app/not-found.tsx` のような別の規約を足す形が素直
- `<Type.Object>` / `<Type.Field>` は `stdin.tsx` の JSON 構造宣言のためだけに存在する。ネストが深い JSON では JSX が冗長になるので、`mode="json"` の場合だけ `schema` prop (valibot 直渡し) を推奨する運用にするか要検討
- `<Arg variadic>` (可変長位置引数) と `<Type.Array>` の関係。`variadic` は「位置引数を何個も取る」、`Type.Array` は「1 つの値が配列」なので別物だが、生成される型は両方 `string[]` になり混同しやすい
- ADR 11 の代償 (env / argv 検証エラーが middleware を通らない) が実用上問題になるなら、計測・ロギングの責務を `app/global-error.tsx` 側に寄せる形を Phase 5 で検討する
- ADR 12 の起動時間は**未実測の見込み**。Phase 8 のベンチで単一ファイルのまま 10ms を割れるか確認し、割れない場合は `--splitting` へ切り替える
- `middleware.tsx` の `children` だけが遅延評価の関数で、他の `children` (layout) と意味が違う。統一するなら layout も thunk にするか、middleware の prop 名を `next` に戻すかを Phase 5 で決める
- `middleware.tsx` が JSX を差し替えられる設計は強力だが濫用されうる。v1 では「前後処理のみ、出力差し替えは非推奨」として文書化するか要検討
- `<Columns>` の幅分配アルゴリズム (均等 / 内容比 / 明示 flex) は Phase 7 で決める
