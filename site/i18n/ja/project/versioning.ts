import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'バージョニング',
  description:
    'バージョンはタイムスタンプです。それが ^ と ~ にとって何を意味するか。',
  blocks: {
    'Versions are timestamps, not SemVer: `YYYY.MMdd.HHmm` in UTC. `2026.828.1430` was published on 2026-08-28 at 14:30 UTC.':
      'バージョンは SemVer ではなくタイムスタンプで、UTC の `YYYY.MMdd.HHmm` です。`2026.828.1430` は 2026-08-28 14:30 UTC に公開されたものです。',
    '**This changes what `^` and `~` mean for you.** `^2026.828.1430` allows anything below `2027.0.0`, and `~2026.828.1430` allows anything later that same day. Pin the exact version if that matters to you.':
      '**このため `^` と `~` の意味が変わります。** `^2026.828.1430` は `2027.0.0` 未満のすべてを許し、`~2026.828.1430` は同じ日のそれ以降のすべてを許します。気になるなら正確なバージョンに固定してください。',
    '## Breaking changes': '## 破壊的変更',
    'A version number is a date, so it cannot tell you whether an upgrade is safe. Instead:':
      'バージョン番号は日付なので、上げても安全かどうかは教えてくれません。代わりに次のようにしています:',
    '- nothing is removed without warning. It is deprecated first, keeps working, and is removed **one year later**\n- `decopin build` warns when your code uses something deprecated, and tells you what to use instead and by when\n- every GitHub Release lists breaking changes and pending removals at the top':
      '- 予告なしに削除することはありません。まず非推奨にし、動くまま残し、**1 年後に**削除します\n- 非推奨のものをコードが使っていると `decopin build` が警告し、代わりに何を使えばよいか、いつまでに移ればよいかを伝えます\n- GitHub Release には毎回、破壊的変更と削除予定を先頭に載せます',
    '## Currently deprecated': '## 現在非推奨のもの',
    '| Deprecated | Use instead | Removed after |\n| --- | --- | --- |\n| `Type.Date` | `<Type.Instant/>` for a moment, `<Type.PlainDate/>` for a calendar day | 2027-08-29 |\n| `command.tsx` | `cmd.tsx` (`command.ts` → `cmd.ts`) | 2027-09-02 |':
      '| 非推奨        | 代わりに使うもの                                         | 削除予定日 |\n| ------------- | -------------------------------------------------------- | ---------- |\n| `Type.Date`   | 瞬間には `<Type.Instant/>`、暦日には `<Type.PlainDate/>` | 2027-08-29 |\n| `command.tsx` | `cmd.tsx` (`command.ts` → `cmd.ts`)                      | 2027-09-02 |',
  },
} satisfies PageTranslation;
