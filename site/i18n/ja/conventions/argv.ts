import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'argv.tsx',
  description:
    '引数とオプションを一度だけ宣言すれば、検証・--help・型がついてきます。',
  blocks: {
    'What you write in `argv.tsx` drives all three of validation, `--help`, and **types**. You never write the validation library by hand.':
      '`argv.tsx` に書いたものが、検証・`--help`・**型**の 3 つすべてを決めます。検証ライブラリのコードを手で書くことはありません。',
    'Nesting is what you want when the type itself recurses.':
      '型そのものが入れ子になるときは、子要素として入れ子にします。',
    '## Dates': '## 日付',
    'Dates come in two flavours, because a moment and a calendar day accept different input and are not interchangeable.':
      '日付には 2 種類あります。「瞬間」と「暦の日付」は受け付ける入力が違い、互いに置き換えられないからです。',
    '`Type.Instant` needs an offset (`Z` or `+09:00`); `Type.PlainDate` refuses one.':
      '`Type.Instant` にはオフセット (`Z` や `+09:00`) が必要で、`Type.PlainDate` はオフセットを受け付けません。',
    '`Type.Date` still works and still gives you a `Date`, but it is deprecated: `decopin build` warns, and it is removed after 2027-08-29.':
      '`Type.Date` は今も動き、`Date` を返しますが非推奨です。`decopin build` が警告し、2027-08-29 以降に削除されます。',
    '## Type and presence live at different levels':
      '## 型と省略可否は別の場所に書く',
    '| What it decides | Where it goes |\n| --- | --- |\n| the type and its constraints | children (`Type.*`) or the `type` shorthand |\n| whether it can be omitted | props on `<Arg>` / `<Option>` (`required` / `default`) |':
      '| 決めるもの           | 書く場所                                               |\n| -------------------- | ------------------------------------------------------ |\n| 型とその制約         | 子要素 (`Type.*`) か、`type` の省略記法                |\n| 省略してよいかどうか | `<Arg>` / `<Option>` の props (`required` / `default`) |',
    '`required` and `default` cannot both be set (with neither, the value is optional).':
      '`required` と `default` は同時に指定できません (どちらも無ければ省略可能になります)。',
    '## The declaration is where your types come from': '## 宣言が型の出どころ',
    'So does `--help`.': '`--help` も同じ宣言から作られます。',
    'Boolean aliases bundle: `-nu` is `-n -u`.':
      '真偽値の別名はまとめて書けます。`-nu` は `-n -u` と同じです。',
    '## Reserved names': '## 予約済みの名前',
    '`--help`, `-h`, `--version`, `--no-color`, `--json` and `--dry-run` belong to the framework. Declaring any of them here is a build error. See [Reserved options](/guides/reserved-options/).':
      '`--help`、`-h`、`--version`、`--no-color`、`--json`、`--dry-run` はフレームワークのものです。ここでどれかを宣言するとビルドエラーになります。[予約済みオプション](/guides/reserved-options/) を参照してください。',
  },
} satisfies PageTranslation;
