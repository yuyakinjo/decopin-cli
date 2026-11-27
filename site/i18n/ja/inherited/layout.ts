import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'layout.tsx',
  description: 'ディレクトリより下のすべてのコマンドの出力を包みます。',
  blocks: {
    '`layout.tsx` wraps the output. It is inherited: one in `app/user/` wraps `user list`, `user import` and everything else under it, and one in `app/` wraps the whole CLI. Layouts nest from the outside in, the way Next.js layouts do.':
      '`layout.tsx` は出力を包みます。継承されるファイルなので、`app/user/` に置いたものは `user list`、`user import` などその下のすべてを包み、`app/` に置いたものは CLI 全体を包みます。Next.js のレイアウトと同じく、外側から内側へと入れ子になります。',
    '## Opting out': '## 適用を外す',
    'A command that must not be wrapped (one whose output is consumed by a script, say) exports `skipLayout`:':
      '包まれては困るコマンド (出力をスクリプトが読むものなど) は `skipLayout` を export します:',
    '`--json` skips layouts on its own, since it prints data, not a view.':
      '`--json` はビューではなくデータを出すので、何もしなくてもレイアウトを飛ばします。',
    '## Layout or middleware?': '## layout か middleware か',
    'A layout sees the rendered output and can only add around it. When you need to run code before or after the command, or to decide whether it runs at all, use [`middleware.tsx`](/inherited/middleware/).':
      'レイアウトが見るのは描画済みの出力で、できるのはその周りに足すことだけです。コマンドの前後でコードを動かしたいときや、そもそも実行するかどうかを決めたいときは [`middleware.tsx`](/inherited/middleware/) を使います。',
  },
} satisfies PageTranslation;
