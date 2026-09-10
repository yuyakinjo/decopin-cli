# Intent-First Development — `decopin` への適用実験

`intent.txt` の開発モデルを、既存の機能に当てて試す。既にある実装からの回収なので、
これは Intent-First そのものではなく §12 の **Intent Recovery**。

| 実験 | 対象            | Intent                               | Behavior     |
| ---- | --------------- | ------------------------------------ | ------------ |
| 1    | `decopin init`  | `start-by-writing-commands`          | 4 + waived 1 |
| 2    | `decopin gen`   | `add-conventions-without-memorizing` | 6            |
| 3a   | `decopin build` | `ship-what-the-directories-declare`  | 5            |
| 3b   | 生成された CLI  | `run-commands-as-declared`           | 10           |
| 4    | `decopin dev`   | `keep-types-honest-while-editing`    | 5 + waived 1 |

将来 `intent.ts` として切り出すのは `core.ts` / `evidence.ts` / `evidence.bun.ts`
だけ。`init/` `gen/` `build/` `runtime/` `dev/` はその利用例。

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
bun experiments/intent/doc.ts --run
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

## まだ答えていない問い

- Question C (一方向パターン) — 未着手。`init` は既存コードなので当てられない
- Question E (同じ Graph を 2 パターンで) — 未着手
- Question F (Behavior が増えても複雑化しないか) — 記述量は逓減した (11, 17)。
  残るのは「Intent どうしの関係」。今のところ Graph は Intent を並べるだけで、
  依存も順序も持たない。5 つでは足りていない
- 大きい Intent (Behavior 10) と、判断を経ずに広がった Intent を、
  Graph からは区別できない (14)。§11.4 の信号の扱いが未決
- `sharedCarriers()` の検出 2 件はどちらも正常な再利用だった (20)。
  **異常を 1 件も捉えていない検出器**が要るかは、もっと数が出てから
- Question H (AI Agent が Graph を使って変更できるか) — 未着手
- Evidence の断片はテストファイル単位。同じ Intent を複数ファイルが証明する
  場合は `mergeReports()` で合流するが、**並列プロセスで走らせた場合は未検証**
- 絞り込み実行 (`bun test experiments/`) だと走らなかった分の断片が古いまま
  残る。`doc.ts --run` が毎回 `.decopin-intent/` を消してフル実行するのはその
  ため。この「フル実行しないとドキュメントが作れない」制約が実用に耐えるかは
  Intent が増えてから
