import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'セットアップのエラー',
  description:
    '何が足りないかと、それを直すコマンドを、機械も読めるフィールドで伝えます。',
  blocks: {
    'Two shapes every CLI ends up needing, both saying what is missing **and the command that fixes it**:':
      'どの CLI もいずれ必要になる 2 つの形です。どちらも何が足りないか、**そしてそれを直すコマンド**を伝えます:',
    "These are ordinary errors, so they travel the [`error.tsx`](/inherited/error/) path and can be branched on with `error.kind` (`'auth'` / `'missing-tool'`). The fix lines live on `error.hints`, and they reach `--json` as well:":
      "これらは普通のエラーなので [`error.tsx`](/inherited/error/) の経路を通り、`error.kind` (`'auth'` / `'missing-tool'`) で分岐できます。直すための行は `error.hints` にあり、`--json` にも届きます:",
    'That last part is the point. A person reading `gh auth login` knows what to do next; an agent needs the same thing in a field it can read, which is why hints are not only formatting.':
      '肝心なのは最後の部分です。人は `gh auth login` を読めば次に何をすればよいかわかりますが、エージェントには同じことを読めるフィールドで渡す必要があります。ヒントが単なる見た目の整形ではないのはそのためです。',
  },
} satisfies PageTranslation;
