# Intent-First Development — `decopin` への適用実験

> 2026-09-14 に `experiments/intent/` から `test/intent/` へ移した (ADR 48)。以下は
> 実験の記録なので、本文中のパスは当時のまま残してある。

`intent.txt` の開発モデルを `decopin` に当てて試す。実験 1〜4 は既にある実装から
Intent を回収する §12 の **Intent Recovery**。実験 5 と 6 は、実装を書く前に Intent と
Behavior を決める **Intent-First**。

| 実験 | 対象            | Intent                                        | Behavior     | 向き      |
| ---- | --------------- | --------------------------------------------- | ------------ | --------- |
| 1    | `decopin init`  | `start-by-writing-commands`                   | 4 + waived 1 | Recovery  |
| 2    | `decopin gen`   | `add-conventions-without-memorizing`          | 6            | Recovery  |
| 3a   | `decopin build` | `ship-what-the-directories-declare`           | 6            | Recovery  |
| 3b   | 生成された CLI  | `run-commands-as-declared`                    | 10           | Recovery  |
| 4    | `decopin dev`   | `keep-types-honest-while-editing`             | 5 + waived 1 | Recovery  |
| 5    | `decopin docs`  | `know-what-a-command-does-without-running-it` | 6            | **First** |
| 6    | 宣言の返り値型  | `notice-declaration-mistakes-while-typing`    | 6            | **First** |

将来 `intent.ts` として切り出すのは `core.ts` / `evidence.ts` / `evidence.bun.ts`
だけ。`init/` `gen/` `build/` `runtime/` `dev/` `docs/` `returns/` はその利用例。

## ファイル

| ファイル                   | 役割                                            |
| -------------------------- | ----------------------------------------------- |
| `core.ts`                  | Intent / Behavior / Implementation の型と Graph |
| `evidence.ts`              | `describeBehavior` / `proves` / `report`        |
| `evidence.bun.ts`          | bun:test のアダプタ (ランナー依存はここだけ)    |
| `doc.ts`                   | Evidence の断片を読んでドキュメントを出す       |
| `<name>/intent.ts`         | Intent 1 つ                                     |
| `<name>/behavior.ts`       | Behavior                                        |
| `<name>/implementation.ts` | Behavior ↔ 実装の対応 (実装は `src/` のまま)    |
| `<name>/<name>.test.ts`    | Evidence                                        |

採ったのは §8.2 の**証明分離パターン**。実装は普通の TypeScript のままで、
`implementation.ts` は何も生成しない。既存コードに後から当てるならこれ以外に
選択肢がなかった (Question D の暫定の答え)。

各 `*.test.ts` は `test/integration/` から移して結び直したもの。同じ証明を
2 箇所に置かないため、元のファイルは消してある。

## 自動ドキュメント (§15)

```
bun run intent:doc
```

テストをフル実行し、`.decopin-intent/` に落ちた断片をまとめて出す。**テストを
走らせないと何も出ない**のは意図したところで、Evidence はテストの実行結果
そのものだから (§10)。実出力:

```
Intent: start-by-writing-commands
Purpose:
  利用者が設定を組み立てるところではなく、コマンドを書くところから始められるようにする
Behaviors:
  ✓ runs-from-scratch — 生成した雛形だけで build が通り、dist/index.js hello が挨拶する
      Evidence ✓ bun run build が警告なしに通る
      Evidence ✓ dist/index.js hello が挨拶する
      Implementation: templates (src/core/init/index.ts)
      Implementation: init (src/core/init/index.ts)
  ✓ typechecks-as-generated — 生成した tsconfig.json で tsc --noEmit が通る
      Evidence ✓ 生成した tsconfig.json で型検査が通る
      Implementation: templates (src/core/init/index.ts)
  ✓ never-overwrites — 既にあるファイルは書き換えず、残したものとして報告する
      Evidence ✓ 二度目の init は何も書き換えない
      Implementation: writeTemplates (src/core/scaffold/write.ts)
      Implementation: init (src/core/init/index.ts)
  ✓ tells-the-next-step — 書いたファイルと、次に打つコマンドを順に出す
      Evidence ✓ 書いたファイルと次に打つコマンドを出す
      Implementation: run (src/cli/init/cmd.ts)
```

## 効くことを確認した (Intent Theater でないこと)

**宣言だけして誰も担わない Behavior**。`installs-dependencies` を 1 つ足して、
実装も証明も結ばずに回した:

- **型検査が落ちた** — `implement()` の引数に `'installs-dependencies'` が無い
  (Behavior ↔ Function、§11.6 Hidden Behavior)
- **テストが落ちた** — `report()` が証明されていない id を挙げる
  (Behavior ↔ Test、§11.3 Behaviorless Intent)

**落ちている証明**。`templates()` の `default="world"` を `"there"` に変えて
`hello` の証明を落とした:

```
(fail) runs-from-scratch ... > dist/index.js hello が挨拶する
(fail) start-by-writing-commands: 全 Behavior が証明されている
```

ドキュメント側も ✗ に変わる (同じ Behavior に通った証明が別にあっても):

```
  ✗ runs-from-scratch — ...
      Evidence ✓ bun run build が警告なしに通る
      Evidence ✗ dist/index.js hello が挨拶する
```

つまり「テストがあるだけ」では ✓ にならない (§11.7 False Verification)。

**不要になった `waived()`**。`installs-dependencies` に通る `proves()` を足した:

```
(fail) start-by-writing-commands: 不要な waived() が残っていない
error: 証明できているので waived() を外す: installs-dependencies
```

免除は証明できるようになった時点で落ちる。`@ts-expect-error` と同じ性質で、
放っておいても抜け穴が永久に残らない。

なお、この判定は `report()` より前に `proves()` が並んでいることに依存する。
`report()` をファイル末尾で呼ぶ制約は、`unproven()` だけでなくこちらにもかかる
(実際、後ろに足して一度素通りさせた)。

## この実験で分かったこと

**1. Hidden Behavior が実際に 1 件出た。** 既存のテストは 3 つの Behavior しか
見ていなかった。`tells-the-next-step` (何を書いたか + 次に打つコマンド) は
`cmd.ts` の実装にあるのに誰も証明していない。Behavior を先に並べたから
気づけたので、Question G (乖離を検出できるか) は小さいながら「できた」。

**2. 「証明できないものは宣言しない」は間違いだった。** 当初 `installDependencies()`
はどの Behavior にも結ばれていなかった。`bun add` の証明がネットワークに左右されて
テストの中で確定しないので、宣言しない方を選んだ結果だった。

しかしこれは **Intent Graph から機能が 1 つ消える**ということで、沈黙は記録に
残らない。そこで `waived(id, description, why)` を足した。証明は要求しないが、
理由つきでドキュメントに残り続ける。**欠落を負債として可視化する。**

TypeScript の `as` に近い。機械は確かめず、責任は人間側にある。`unknown` に
あたる「まだ証明していない」とは扱いが違うので、記号も分けてある:

| 記号 | 意味                                                     | TS でいうと |
| ---- | -------------------------------------------------------- | ----------- |
| `✓`  | 通った Evidence があり、落ちたものが無い                 |             |
| `✗`  | 落ちた Evidence がある                                   |             |
| `–`  | 証明しないと決めた (理由つき)                            | `as`        |
| `?`  | Evidence が 1 つも無い。まだ書いていない                 | `unknown`   |
| `!`  | Evidence はあるが結果が返っていない (絞り込み実行・中断) |             |

Carrier は繋いだままにしてある。**証明の免除は実装の免除ではない。**

**3. Behavior の粒度 (Question B) は「利用者が観測できる結末」に置けた。**
`writeFile` に `wx` を渡す、といった実装の詳細は Behavior にしていない
(§11.4)。4 つに割れたのは「失敗の仕方」が 4 通りあるからで、この基準は
他の機能にも移せそう。

**4. 型で守れたのは Graph の構造だけ。** §9 のとおりで、`Carrier` は関数の
実体を持つだけ、シグネチャは見ていない。これで十分に見えるが、
「関数はあるが中身が Behavior と無関係」(§11.10) は型では防げない。

**5. bun:test の `describe` の body は、呼び出し直後には走らない。**
最初は「ブロックを抜けた時点で `proves()` の数を見る」実装にしたが、
収集の順序が違って常に 0 になった。判定はファイル末尾の `report()` に移した。

**6. テスト結果の取得に、ランナーの reporter API は要らなかった。**
`proves()` が fn を受け取っているので、包めば pass/fail が分かる。`afterAll`
の時点で全件が揃っていることも実測で確認した。結果ランナーに求める面は
`describe` / `test` / `afterAll` の 3 つだけになり、`evidence.bun.ts` を
差し替えれば vitest / jest / node:test にも載る (§19 の「どの Test Runner に
依存させるか」への暫定の答え)。

## 実験 2 (`gen`) で分かったこと

**7. Carrier は関数だけではなかった。** `gen` の担い手には `FILE_TEMPLATES`
(雛形の中身の表) と `GENERATOR_KINDS` (生成できる種類の表) と
`GenerateUsageError` (クラス) が出た。`init` はたまたま全部が関数だっただけで、
**「呼べること」は最初から一度も使っていなかった**。効いていたのは「値への参照を
持つので、消せば型検査が落ちる」だけ。`Carrier` を `object` に広げ、名前は
`name` を持つ値なら実体から取り、持たない定数だけ第 3 引数で補う形にした。

**8. Carrier の解像度は公開 API に縛られる。** `refuses-symbolic-links` の実体は
`generate.ts` 内の `rejectLinkedDirectories()` だが、export されていないので
Carrier は `generate` を指すしかない。結果、`refuses-outside-the-router` と
`refuses-symbolic-links` が同じ Carrier を持つ。Behavior は 2 つに割れているのに
Graph 上では区別が付かない。**Graph の粒度を上げたければ export を増やすことに
なる**が、それは Intent のためにモジュール境界を動かすことなので、やらなかった。

**9. Behavior に割り直したらテストが 1 件割れた。** 元の
「不正な引数や配置先はファイルを作らず usage error を返す」は、12 通りの引数を
1 つのループで回していた。結末 (exit 2・何も作らない) が同じなので 1 テストで
足りていたが、**直す場所は `cmd.ts` と `generate.ts` で別**。Behavior を先に
並べると、この「同じ結末・違う原因」が表に出る。

**10. 別の Intent どうしで Behavior が重複した。**

| Intent                               | Behavior               | Carrier          |
| ------------------------------------ | ---------------------- | ---------------- |
| `start-by-writing-commands`          | `never-overwrites`     | `writeTemplates` |
| `add-conventions-without-memorizing` | `keeps-existing-files` | `writeTemplates` |

説明文もほぼ同じ (「既にあれば書かず、残したものとして報告する」)。§11.8 が
言う重なりの信号がそのまま出た形だが、**これは Intent Duplication ではない**。
init (最初の 1 回) と gen (2 個目以降) は別の目的で、たまたま同じ保証を必要と
している。

**重なっていたのは Behavior ではなく Carrier だった。** id も description も
別物で、同じなのは担い手だけ。intent.txt が「1 つの関数が正当に複数の Intent を
担うことはある」と書いていた側が先に出たことになる。

そこで **Behavior の共有は禁止**にした (intent.txt §5.1 を追加)。許すと 4 つ
保てなくなる:

| 壊れるもの          | 理由                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| 免除                | `waiver` は Behavior が持つ。片方の Intent の都合で他方の証明が消える  |
| 証明の所属          | Evidence は (Intent, Behavior) で記録する。二重に書くか片方が未証明    |
| Carrier の一貫性    | `implement()` は Intent 単位。同じ Behavior に別の実装を結べてしまう   |
| Intent の削除 (§13) | Intent を消すとき Behavior を消してよいか決まらない。所有者が 2 人いる |

`intent()` に Behavior id のグローバルな所有者検査を足した。別の Intent が同じ
id を宣言すると落ちる:

```
error: Behavior は共有できない (§5.1): shared-one は a のもの。b の文脈で言い直すこと
```

代わりに、重なりは Carrier の側で**一覧に出す**ようにした
(`sharedCarriers()`、`doc.ts` の末尾)。違反ではないので落とさない:

```
複数の Intent が担わせている実装:
  writeTemplates (src/core/scaffold/write.ts)
      add-conventions-without-memorizing / writes-known-conventions
      add-conventions-without-memorizing / keeps-existing-files
      start-by-writing-commands / never-overwrites
```

**疑いを出すところまでで止める**のは、purpose が同じ目的を指しているかどうかを
機械が判定できないから。自然言語なので、そこは人が決める。

**11. 記述量は Behavior あたり一定だった (Question F の 1 つ目の答え)。**

| 実験     | Behavior | 記述 (intent+behavior+implementation) | 1 つあたり |
| -------- | -------- | ------------------------------------- | ---------- |
| 1 `init` | 5        | 115 行                                | 23 行      |
| 2 `gen`  | 6        | 142 行                                | 23.7 行    |

ランタイム側 (593 行) は Intent を足しても増えない (7 の修正 +15 行のみ) ので、
**比率は 5.2 : 1 から 2.3 : 1 に改善した**。Intent を足すほど元が取れる方向。

一方で **Evidence は増えた**: `gen` のテストは 162 行 → 228 行 (+40%)。内訳は
`describeBehavior` の包み (6 ブロック)、割れたテストの重複した前後比較、
ヘッダのコメント。証明の中身は 1 行も変えていない。

## 実験 3 (`build` と生成された CLI) で分かったこと

**12. 1 つのテストファイルに 2 つの Intent が入っていた。** `build.test.ts` は
`describe('build')` 3 テストと `describe('生成された CLI')` 22 テストに
分かれていた。後半はビルドではなく、**ビルド結果が実行時に何をするか**を
見ている。同じ Intent の Behavior として並べると「ビルドが壊れた」と
「実行時が壊れた」が一列になるので、2 つに割った。

境界は **build は何を書いたかまで、runtime は書いたものが何をするか**。
生成物が「起動できる」は build 側、「宣言どおりに動く」は runtime 側。

割った結果、2 つの Intent は Carrier を 1 つも共有していない。**目的の違いは
実装の分かれ目とも一致していた**。§11.5 の信号 (無関係なものが同じ Intent に
いる) は、Carrier の集合を見ても出せた可能性がある。

**13. Hidden Behavior が 2 件出た。しかも大きい方だった。**
`src/cli/build/cmd.ts` の出力 — 見つけたコマンド、書いた 3 種類の生成物、
コマンドごとに到達する副作用と経路 (ADR 32) — を、**どのテストも見ていなかった**。

```
$ grep -rn "Found .*command\|Effects reachable" test/ docs/
(no output)
```

init の `tells-the-next-step` と同じ形が、より大きな規模で出た。共通点は
**CLI 層の出力**であること。ライブラリとして呼ぶ側 (`build()` / `init()`) の
テストは充実していて、人が読む出力だけが抜ける。

**14. Behavior が 10 個になった。§11.4 の信号と区別が付かない。**
`run-commands-as-declared` は cmd / argv / stdin / help / error / layout /
middleware / not-found の 8 規約を抱えるので、Behavior も 10 になる。

§11.4 Behavior Explosion は「Intent が判断を経ずに広がった兆候」とされるが、
**この Intent は広がったのではなく最初から広い**。数だけでは両者を区別できない。
判断が要るのは purpose の側で、ここは機械が見られない (10 と同じ構造)。

**15. 入口が 1 つに集まる設計では Carrier が重なるのが正常。**
`run` (src/core/runtime/run.tsx) が 10 個の Behavior すべてに出る。実験 2 の
finding 8 (解像度は公開 API に縛られる) の裏返しで、**分岐が 1 つの関数を
必ず通るなら、Carrier の重なりは設計どおり**。区別を付けているのは `run` と
並ぶもう 1 つの Carrier の方になる。

**16. Evidence と普通のテストは共存する。** `test/build/*.test.ts` の 12 ファイル
(scanner / codegen / effects / bundler …) は移していない。あれは利用者が
観測できる結末ではなく実装の内部を見るテストで、Behavior にすると §11.4 に
なる。**すべてのテストが Evidence になるわけではない**というのが、
init/gen (テストファイルごと移せた) では見えていなかった点。

**17. 記述量は Behavior が増えるほど安くなった (Question F の続き)。**

| 実験         | Behavior | 記述 | 1 つあたり |
| ------------ | -------- | ---- | ---------- |
| 1 `init`     | 5        | 115  | 23.0       |
| 2 `gen`      | 6        | 142  | 23.7       |
| 3a `build`   | 5        | 112  | 22.4       |
| 3b `runtime` | 10       | 187  | **18.7**   |
| 4 `dev`      | 6        | 106  | 17.7       |

10 個並べたところで 1 つあたりが下がる。ヘッダのコメントと import が
Behavior 数で割られるため。**線形どころか少し逓減する**。

合計 32 Behavior・記述 662 行に対してランタイムは 674 行なので、**比率は
2.3 : 1 から 1.0 : 1**。

Evidence は 278 行 → 827 行。増分の一部は、**2 つの Intent がそれぞれ自前で
ビルドする**ようにしたぶんの重複 (`beforeAll` / `cli()`)。どちらが落ちたのか
混ざらないことを優先して、共有しなかった。

## 実験 4 (`dev`) で分かったこと

**18. 「watch なので免除だらけになる」という予想は外れた。**

着手前の予想は「Evidence がほぼ `waived()` になる Intent の題材」だった。
実際は 6 個中 1 個だけで、しかもそれは「watch すること」ではなく
**OS のファイル通知に触る一点** (`watches-the-real-filesystem`) だった。

差が出たのは `watchApp()` が第 2 引数で通知の受け口 (`WatchBackend`) を
差し替えられるように作ってあったから。つまり免除の範囲を決めていたのは
**「非決定的な機能かどうか」ではなく、非決定な部分がどこまで括り出して
あるか**だった。裏返すと、`waived()` が増える Intent は仕様が難しいのでは
なく、**実装が境界を括り出していない**という信号として読める。

**19. 「証明の免除」は「実装の免除」ではない。**

`watches-the-real-filesystem` にも Carrier は繋いである。実体は
`NODE_WATCH_BACKEND` だが export されていないので `watchApp` で指した
(実験 2 の finding 8 と同じ制約)。免除したのは証拠であって、
どのコードが担っているかは分かったままにしておける。

**20. 重なり検出 (§11.8) の 2 例目が出た。**

`build()` が `ship-what-the-directories-declare / produces-one-runnable-file`
と `keep-types-honest-while-editing / rebuilds-on-every-change` の両方に出る。
`sharedCarriers()` は疑いとして出すが、これは正常な再利用だった —
**build は配れるものを作る、dev は書いている間ずれないようにする**で、
purpose が別の目的を指しているため (§5.1 の 2 段読み)。1 例目
(`writeTemplates`) と合わせて、検出された 2 件はどちらも正常だった。
**検出器は今のところ偽陽性しか出していない**。

**21. 目的が近い 2 つの Intent は、境界を言葉で書かないと決まらない。**

`build` と `dev` はどちらも「生成物を作る」。分けた根拠は実装 (`watchApp` の
有無) ではなく purpose の側で、`intent.ts` のヘッダに **build は配れるものを
作る / dev は書いている間ずれないようにする**と書いて初めて Behavior の
振り分けが決まった。3a/3b の分割 (finding 12) が実装の境界と一致していたのに
対し、ここは**実装の境界と Intent の境界がずれている**例。

## 実験 5 (`docs`) で分かったこと — 初めての Intent-First

これまでの 5 つは既存コードからの回収だった。ここは **Intent と Behavior を
書き、型検査を通してから `src/` に 1 行目を書いた**。題材は Issue #3
(app/ の構造からドキュメントを生成する)。

**22. 「実行可能」の解釈が、Intent を書く段で 1 回決まった。**

Issue の言葉は「コマンド単位で実行可能」で、頭にあったのは OpenAPI の
「押したら結果が返る」形だった。押せる HTML にすると**任意のコマンドを
実行するサーバー**を抱える。purpose を書こうとして初めて、欲しいのは
押せることではなく **「打たずに結果が分かること」** だと分かり、
`know-what-a-command-does-without-running-it` に落ちた。**実装の選択肢を
削ったのは設計判断ではなく、purpose を 1 文にする作業**だった。

**23. 予想は 2 つとも外れた (どちらも良い方向に)。**

| 予想                                           | 実際                 |
| ---------------------------------------------- | -------------------- |
| 実装しながら Behavior を書き換える回数が増える | **0 回**。6 個のまま |
| `waived()` は 0 個                             | 0 個 (これは当たり)  |

書き換えが 0 だったのは、Behavior を「利用者が観測できる結末」で割ってあり、
**出力の形 (Markdown か HTML か、表かリストか) を一切書かなかった**ため。
実装中に何度も変えたのは表の列や見出しの体裁で、そこは Behavior の外にあった。
Intent Recovery では実装を見ながら書くので、つい形が混ざる。**先に書くほうが
かえって実装から遠い言葉になる**という逆の結果。

**24. Behavior は変わらなかったが、Carrier の場所は 1 回変わった。**

最初 `src/core/docs/index.ts` に書いたら、リポジトリ自身のガードが
ADR 41 (core は features を呼ばない) 違反を 5 件出した。docs は argv・example・
help の規約を読むので core には置けない。`src/cli/docs/document.ts` へ移し、
`implementation.ts` の Carrier の `where` を書き換えた。**Behavior は動かず、
Implementation だけが動いた** — §8.2 の証明分離が効いている形。

**25. 新しい規約ファイルを 1 つ足すと、リポジトリの 3 つのガードが順に鳴った。**

`example.tsx` を規約に足したときに落ちたもの:

| 鳴ったもの                  | 中身                                    |
| --------------------------- | --------------------------------------- |
| 型検査 (TS2741)             | `gen` の雛形表に `example` が無い       |
| `file-conventions.test.tsx` | 置けるファイルの一覧に `example` が無い |
| ADR 41 / ADR 14 のガード    | 置き場所と、外に出る文字列              |

Intent Graph はこれを 1 件も検出しない。**Graph が見るのは「この Intent の
Behavior が証明されているか」だけで、リポジトリ全体の整合は見ない。**
Intent-First は既存の規約検査を置き換えるものではない、という線が引けた。

**26. ADR 14 のガードが、私の書いたコードを誤読して 22 件の偽陽性を出した。**

原因は正規表現リテラル ``/`{3,}/g`` の中のバッククォート。ガードの
`stringLiterals()` は素朴な字句解析で正規表現を知らないので、そこから先の
日本語コメントを全部「文字列」として拾っていた。正規表現をやめて 1 文字ずつ
数える形に書き換えて消した。**証拠を出す仕組みは、それ自体が誤検出する** —
§11.7 の裏返し (False Alarm) で、この実験でも `evidence.ts` の
タイムアウト穴と同じ日に 2 例目が出た。

**27. 記述量は逓減しなかった。**

| 実験         | Behavior | 記述 | 1 つあたり |
| ------------ | -------- | ---- | ---------- |
| 3b `runtime` | 10       | 187  | 18.7       |
| 4 `dev`      | 6        | 106  | 17.7       |
| 5 `docs`     | 6        | 146  | **24.3**   |

Intent Recovery より高い。増えたぶんは**予想と、採らなかった選択肢の理由**
(押せる HTML を採らない、help と docs の境界) で、既存コードから起こすときは
書く必要がなかったもの。**Intent-First では Intent がドキュメントを兼ねる**
ので、この差は無駄ではなく、置き場所が移っただけと読める。

## 実験 6 (宣言ファイルの返り値型) で分かったこと — Question C の答え

題材は ADR 46。`env.tsx` などの宣言ファイルに返り値型を配り、`dev --annotate`
に書き足させる。狙いは機能そのものより **§8.1 一方向パターン (Question C)** を
測ること。予想は 2 つ書いてから始めた。

**28. 一方向パターンは、型検査でもテストでもなく「配布物の組み立て」で落ちた。**

`src/core/build/annotate.ts` の `annotateReturnSource` を `carries()` で包んだ:

| 段                      | 結果                                                                         |
| ----------------------- | ---------------------------------------------------------------------------- |
| `bunx tsc --noEmit`     | 通る                                                                         |
| `bun test annotate`     | 17 pass / 0 fail                                                             |
| `bun run build:package` | **落ちる** TS6059: `experiments/intent/core.ts` is not under `rootDir` `src` |

`carries()` は実装そのものを包むので、**Intent ランタイムが配布物に入る**。
`rootDir` はそれを機械的に拒否した。予想 (「成立しない」) は当たったが、
落ちる場所の予想はできていなかった。アプリなら払える代償だが、npm に出す
ライブラリでは払えない。**公開ライブラリの `src/` では §8.2 が強制される**
— これが Question C への答え。逆に言えば、一方向が使えるのは
**実装と Intent が同じ配布単位に居られる場合だけ**。

**29. §8.1 は「消せない対応表」と引き換えに、依存の向きを 1 本増やす。**

§8.2 の `implement()` は `experiments/ → src/` の一方向で、`src/` は Intent を
知らない。§8.1 は `src/ → experiments/` を足すので、**実装が Intent に依存する**。
対応表が実装から剥がれないという利点は、そのまま「Intent を消すと実装が
コンパイルできない」という結合でもある。intent.txt §8.3 は「どちらでも同じ
Graph になる」と言うが、**同じなのは Graph であって依存グラフではない**。

**30. 予想していた `waived()` は要らなかった。TypeScript 7 が速すぎた。**

「型検査が落ちること」の証明は tsc を子プロセスで回すしかなく、費用次第では
免除するつもりだった。実測は **1 プロジェクトあたり 0.11 秒** (tsc 7.0.2、
ネイティブ実装)。4 プロジェクト回しても実験 6 のテスト全体で 426 ms。
**「重いから証明しない」という判断は、道具が変わると寿命が尽きる。**
waiver の理由に「費用」を書くときは、測り直す日付ごと書いたほうがよさそう。

**31. Behavior の書き換えは 0 回。ただし 1 つは実装の途中で意味が狭まった。**

`ties-data-to-output` は最初「宣言と食い違う `data` は型検査で落ちる」の
つもりだったが、ADR 9 の再測定で **JSX を経由する 5 つには型引数を運べない**
ことが確定し、この Behavior だけが「`output.tsx` があるコマンドの `data.tsx`」に
限定された。文言は書き直していない (最初から `output.tsx` があるコマンドと
書いてあった) が、**Behavior が守っている範囲は測定の後で初めて確定した**。
先に書いた Behavior が正しかったのではなく、**実装不可能な期待を purpose に
書かなかった**のが効いている (purpose は「型安全にする」ではなく
「動かす前に気付ける」)。

**32. 記述量は実験 5 より更に増えた。**

| 実験         | Behavior | 記述 | 1 つあたり |
| ------------ | -------- | ---- | ---------- |
| 3b `runtime` | 10       | 187  | 18.7       |
| 4 `dev`      | 6        | 106  | 17.7       |
| 5 `docs`     | 6        | 146  | 24.3       |
| 6 `returns`  | 6        | 204  | **34.0**   |

増分のほとんどは `implementation.ts` の冒頭 28 行 — **失敗した一方向パターンの
測定記録**。捨てた選択肢の理由を Intent の側に書き残すと記述量は増える。
Intent-First 2 回とも同じ方向に増えているので、(27) は偶然ではない。

## 実験 6 の後に足した Behavior (`build` の木)

**33. 機能追加が、Intent のどこに入るかで自分の大きさを名乗った。**

「build の出力を Next.js のようにコマンドごとの木にしたい」という要望に対し、
入れ先は `ship-what-the-directories-declare` の 6 番目の Behavior
`shows-what-each-command-is-made-of` になった。**新しい Intent は要らなかった**
— purpose (「app/ に置いたファイルだけから配れる 1 本の実行ファイルを得る」)
はそのままで、その結末の見せ方が増えただけ。逆に、もし purpose を書き直したく
なっていたら、それは build に別の目的を混ぜようとしている合図だった。
**Intent は、機能追加の大きさを測る物差しとして使えた** (§13 の逆向き)。

`implement()` が全 Behavior を要求するので、Behavior を足した時点で型検査が
落ち、Carrier を書くまで通らない。**書き忘れが構造的に起きない**のは、
Intent Recovery で作った表が後から効いた初めての例。

## 実験 7 (Question H: AI Agent は Graph を使えるか) と `complete` の回収

2026-09-14〜15。本線に移した後の最初の 2 つ。

**34. Intent 文書は正答率を変えなかった。課題が grep で当たるものだったから。**

同じ作業コピーを 2 つ用意し、読み取り専用の AI エージェント 2 体に同じ課題を
出した: 「`decopin init` が最後に出す Next: に `bun run dev` も足したい。どの
ファイルを変え、どのテストが証明を担い、その中のどこを変えるか」。片方にだけ
Intent 文書 (`bun run intent:doc` の出力、7 Intent / 247 行) を先に読ませた。

- 正答 (`src/cli/init/cmd.ts` の steps 配列 / init の Evidence の
  `tells-the-next-step`): **両方 ○**
- 開いたファイル: 文書あり 11 (文書を含む) / 文書なし 13
- ツール呼び出し: 15 / 15。トークン: 46.7k / 43.3k。所要: 107 秒 / 124 秒

差は誤差の範囲。文書なしの側は `Next:` を grep して `cmd.ts` に当たり、同じ
文字列で Evidence にも当たった。文書ありの側は文書 → `cmd.ts` → Evidence と
降りたが、着地点は同じ。**Graph の「どこを見ればよいか」という価値は、
`test/intent/<name>/` という置き場が既に配っている**。ディレクトリ名から
Intent に届くので、文書が無くても Evidence に当たる。文書の出番は、grep で
当たらない課題 (「色を落とす判断はどこか」のような結末で聞く問い) に限られる
はずで、それは未試行。

**35. 両方のエージェントが Evidence の穴を答えに含めた。**

文書ありは「期待値が `toContain` の連続部分文字列なので、末尾に足すとテストを
直さなくても通る (足した行を誰も見ていない状態になる)」、文書なしは
「`--no-install` の経路しか spawn していないので、依存を入れた側の Next: は
証明されていない」。どちらも正しい。Behavior ↔ `proves()` の構造があると、
エージェントは「何が証明されているか」を答えの一部として返す。これは文書の
有無ではなく置き場の効果 (34 と同じ結論)。

**36. `complete` の回収では Hidden Behavior が出なかった。**

旧 `test/runtime/` の補完テスト 28 件と旧 `test/build/` の zsh シムのテスト
8 件を 1 つの Intent `complete-from-the-declarations` (8 Behavior) に結び直した。
describe 8 つが Behavior 8 つになったが 1 対 1 ではない: 「値の補完」「短縮形に
= を付けた形」「解釈はトークナイザと同じ」の 3 つは結末で見て 2 つに束ね、
「壊れていても落ちない」は宣言が壊れた場合と complete.tsx が壊れた場合を
1 つにした。proves 36 + report 2 = 38 件、77ms。

init (実験 1) と build (実験 3) では回収で Hidden Behavior が 3 件出たが、
ここでは 0 件。補完のテストは最初から「Tab を押した人の結末」がテスト名に
なっていて、Behavior と同じ粒度だった。**回収で増えるのは、元のテストが実装の
都合で切られていたときだけ**。Carrier は `completionCandidates` が 8 Behavior
中 6 つに出る (runtime と同じ入口集中、finding 8 の裏返し)。ADR 21 / 38 の
ガードは Evidence ファイルへ向け直し、ADR 48 のガードは宣言を JSX で書く
Evidence のために `.tsx` も通すようにした。

**37. Intent どうしで demo/app の build を共有するのは見送った。**

dev / build / runtime の Intent がそれぞれ demo/app を build している。共有で
削れる上限は build のテスト全体の 0.2 秒 (4.3 秒中)。dev の 1.1 秒は watch の
待ちで build ではない。21 で引いた境界 (build は何を書いたかまで、runtime は
書いたものが何をするか) を守るには Evidence の前提も別々である方が正しく、
build が壊れたときに runtime の証明が巻き添えで落ちるのは §11.5 の Intent
規模版になる。0.2 秒のために結合しない。

**38. 分担を別プロセスで並列に走らせると、断片が 1 つ消えた。**

`partial: true` で 2 ファイルに分担した Intent を作り、`bun test a.test.ts &
bun test b.test.ts & wait` で別プロセスに走らせた。**断片が 1 つしか
残らなかった**。断片のファイル名が `<intent id>.<証明名の fingerprint>.json`
だったためで、別の Behavior を同じ証明名で分担すると同名になり、後勝ちで
片方が消える。

**同一プロセスでは原理的に起きない**ので気づかなかった。Evidence は
(Intent, Behavior) キーでモジュールに貯まる (`core.ts` の `EVIDENCE`) ので、
2 番目の `report()` は両方の証明を持った断片を書く。ファイル名が自然に分かれる。

落ち方は安全側だった。消えた方の Behavior は未証明になり、`doc.ts` が
「証明されていない Behavior」で exit 1 する。黙って ✓ にはならない。ただし
**テストは全部通っているのに落ちる**ので、CI で見ても原因が読めない。

fingerprint の入力を `<behavior id>/<証明名>` に変えて塞いだ。衝突が消え、
同じ分担なら同じ名前 (冪等) は保った — 並列実行を 2 回繰り返しても断片は 2 つのまま。
ガードは `evidence.test.ts` に置いた。`shardName()` を直接呼ぶ — `toReport()` 経由だと
上の累積のせいで分担を再現できず、**壊しても通るテストになった** (書いた直後に
fingerprint を旧形に戻して確かめた)。

**39. 2 つの Implementation Pattern は同じ Graph を作る。使い分けは型だけ。**

同じ対応を 8.2 (`implement()`) と 8.1 (`carries()` + `collect()`) で組んだと、
`toReport()` の結果が完全に一致した (carrier の順も含めて)。違うのは欠けを
どこで捕まえるかだけ — 8.2 は引数の型が全 Behavior を要求するので型検査が
落ち、8.1 は `collect()` の実行時エラーになる。両方にガードを置いた。

ただし**このリポジトリで 8.1 を使う道は無い**。`carries()` は実装のファイルに
書くから意味があるので、`src/` から Intent ランタイムを import できない
(ADR 48) 時点で置き場が無い。**実験の場所を `experiments/` から `test/` に
移してもこの壁は残った** — 制約はディレクトリの位置ではなく、配布物に
ランタイムを入れられないことにある。8.1 が生きるのはランタイムを同梱できる
アプリ側だけで、公開ライブラリでは 8.2 一択 (28/29 の裏付け)。

**40. grep で当たらない課題では、Intent 文書の有無で答えが変わった。**

34/35 は grep で当たる課題だったので差が出なかった。今回はコードに現れない
語彙で聞いた —「打ち間違えた人が何も分からないまま終わらないようにしたい。今その
面倒を見ているのは何で、どこを直せば案内を 1 行足せるか」。read-only のエージェント 2 体、
片方には `test/intent/` を読ませない。

両方とも `NotFound` (`src/features/conventions/not-found/runtime.tsx`) の同じ行に
辿り着いた。差が出たのは**その先**だった。文書あり側だけが
`demo/app/not-found.tsx` が組み込みを上書きしていること (ADR 30) に気づき、
「組み込みに足すのか、プロジェクトの not-found.tsx に足すのかで影響範囲と
テストが変わる」と書いた。**文書の無い側の答えは、そのままやると demo では
案内が出ない** — 上書きの存在は見ていたが、帰結までは届いていなかった。
確認手順も差が出た。文書ありは最後に `bun test/intent/doc.ts` を置いたが、
無し側はその存在を知らない (読むなと言ったのだから当然だが、**実際に直せば
CI で落ちる**)。

代償はトークン 1.4 倍 (26.6k → 37.1k)、開いたファイル 8 → 13、時間 92s → 105s。

文書あり側も**`doc.ts` の出力は長すぎて読めず、`behavior.ts` を grep した**と
報告している。Intent 文書が効くのは読み物としてではなく、**結末の語彙で引ける
索引**としてだった (35 の layout の話と同じ)。

結論: **実装の命名から結末が辿れる間は文書は要らない。規約で実装が差し替わる層を
またぐときに初めて差が出る**。

**41. Evidence の遅さは Intent-First の代償ではなく、待ち方の問題だった。**

本番採用の障害としてテスト時間を見た。`bun test` が 4.73s (main は 2.5s)、
うち intent が 3.26s。内訳を測ったら、**上位 3 件はどれも待ち方が原因**で、
証明の数や Intent の構造とは関係が無かった。

| 手                                                                            | 前     | 後    |
| ----------------------------------------------------------------------------- | ------ | ----- |
| dev: 固定 `Bun.sleep(300/300/200)` を、**後から必ず起きるビルド**で数える形に | 1111ms | 364ms |
| gen: 独立した `gen` の子プロセス 15 回を `Promise.all` でまとめて起こす       | 857ms  | 518ms |
| returns: tsc 4 プロジェクトを `beforeAll` で先に全部起こす                    | 483ms  | 195ms |

合計 `bun test` 4.73s → **3.38s** (-29%)。main との差は 2.2s → 0.9s。

dev の書き換えは速さだけではない。`sleep` で「これ以上ビルドが来ない」を見るのは
**「まだ来ていない」を見ているだけ**で、待ち時間がそのまま判定の強さになる。
窓の外でもう 1 回変更してそれが 3 回目のビルドになることを見れば、余分なビルドは
必ず 4 回目として現れる。**時間への依存が消えて expect が 19 → 22 に増えた**。

残りの内訳 (gen の 458ms = build + 実行 + tsc、runtime の 452ms = 証明 20 件分の
`cli()` 起動) は実作業なので、ここから削るには証明を弱めるしか無い。

**42. 規約ごとのテストは、動かさずに Evidence にできた。**

`runtime` Intent は 12 Behavior を持ちながら、証明は `runtime.test.ts` の 20 件だけ
だった。同じ結末を見ている `test/runtime/handle-error.test.tsx` などは普通の
テストのままで、**落ちても Intent の ✓ が変わらなかった**。

`report(impl, { partial: true })` で 4 ファイルを分担にした。**ファイルは 1 つも
移動していない** — `describeBehavior` で包んで `test` を `proves` にしただけ。

| ファイル                              | Behavior                             | Evidence |
| ------------------------------------- | ------------------------------------ | -------- |
| `test/runtime/handle-error.test.tsx`  | `handles-errors-where-declared`      | 38       |
| `test/runtime/layout.test.tsx`        | `wraps-output-in-layout`             | 13       |
| `test/runtime/run-not-found.test.tsx` | `guides-when-the-command-is-missing` | 11       |
| `test/runtime/middleware.test.tsx`    | `runs-middleware-around-the-command` | 10       |

分かったことが 3 つある。

1. **`describeBehavior` の中に `describe` は入れられない**。bun:test の `describe` の body は
   収集時に呼ばれるが呼び出しの直後ではないので、中の `proves` が「`describeBehavior` の
   中」の判定をすり抜ける。見出しは証明名に前置して畳む (handle-error は
   「検証エラーは 2」のように文脈が落ちるので前置し、layout / middleware は不要だった)
2. **`test.each` は `proves` にはならない**。for で広げて名前を確定させる。どれが落ちたかが
   そのままドキュメントに出るので、この方が Evidence としては正しい
3. 分担するなら**元のファイルも `partial: true` にする**。同一プロセスだと非 partial の
   `report()` が先に走った時点で、他ファイルの `describeBehavior` が throw する

この形なら**回収は移動を伴わない**。complete のとき (36) はファイルごと `test/intent/` に
移したが、規約ごとのテストは規約の隣にある方が見つけやすい。

**43. ドキュメントは「読むもの」ではなく「引くもの」だった。**

40 で、文書あり側のエージェントも `doc.ts` の出力を途中で読むのをやめて
`behavior.ts` を grep した。出力は当時 200 行超、分担 (42) で 390 行になった。

3 つの形を足した。

- `--list`: Intent 1 件につき 2 行 (印・id・数、次の行に Purpose)。**16 行**。
  結末の語彙は Purpose に入っているので、ここを grep して id を得る
- `doc.ts <id>`: その Intent だけ詳細。無い id はある id を並べて exit 1
- 引数なし: 今までどおり全部 (CI はこれ)

**判定はどの形でも変えない**。絞って出しても、証明されていない Behavior がどこかに
あれば exit 1 する。絞り込みが合格の線を動かせたら、見たいものだけ見る道具になる。

## まだ答えていない問い

- Question C (一方向パターン) — **答えが出た (28, 29)**。公開ライブラリの
  `src/` では使えない。残るのは「アプリ側で使ったときに本当に対応表が
  腐らないか」
- Question E (同じ Graph を 2 パターンで) — **答えが出た (39)**。Intent 全体を
  両パターンで組んだ Graph は一致する。ただし**実際のコードで 8.1 は使えない**
  — `carries()` は実装のファイルに書くパターンなので、ADR 48 が
  `src/ → test/intent/` を禁じた以上置き場が無い (28/29 と同じ壁)
- Question F (Behavior が増えても複雑化しないか) — 記述量は逓減した (11, 17)。
  ただし Intent-First では逆に増えた (27)。残るのは「Intent どうしの関係」。
  今のところ Graph は Intent を並べるだけで、依存も順序も持たない
- 大きい Intent (Behavior 10) と、判断を経ずに広がった Intent を、
  Graph からは区別できない (14)。§11.4 の信号の扱いが未決
- `sharedCarriers()` の検出 2 件はどちらも正常な再利用だった (20)。
  **異常を 1 件も捉えていない検出器**が要るかは、もっと数が出てから
- Question H (AI Agent が Graph を使って変更できるか) — **答えが出た (34, 35, 40)**。
  grep で当たる課題では差が出ないが、**規約で上書きされる層をまたぐ課題では
  文書が無い側が間違えた**。代償はトークン 1.4 倍
- Evidence の断片はテストファイル単位。同じ Intent を複数ファイルで分担して
  証明する場合は `report(impl, { partial: true })` を渡し、「全 Behavior が
  証明されたか」の判定は `mergeReports()` で合流した後 (`doc.ts`) に移る。
  並列プロセスは **38 で検証した**
- 絞り込み実行 (`bun test experiments/`) だと走らなかった分の断片が古いまま
  残る。`doc.ts --run` が毎回 `.decopin-intent/` を消してフル実行するのはその
  ため。この「フル実行しないとドキュメントが作れない」制約が実用に耐えるかは
  Intent が増えてから
