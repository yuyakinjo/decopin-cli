import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'complete.tsx',
  description: '実行時にしか決まらない補完候補。',
  blocks: {
    '`bun run build` writes a zsh completion shim, and `Type.Enum` values complete from the declaration (see [Shell completion](/guides/shell-completion/)). For names that only exist at run time (a cluster, a branch, a user) add `complete.tsx` next to the command.':
      '`bun run build` は zsh 用の補完の受け口を書き出し、`Type.Enum` の値は宣言から補完されます ([シェル補完](/guides/shell-completion/) を参照)。実行時にしか存在しない名前 (クラスター、ブランチ、ユーザーなど) を補完したいときは、コマンドの隣に `complete.tsx` を足します。',
    'It receives which argument is being completed and what has been typed so far, and returns candidates; the framework filters by prefix and shows the description next to each value:':
      'どの引数を補完しているのかと、それまでに入力された内容を受け取り、候補を返します。前方一致での絞り込みはフレームワークが行い、各値の隣に説明を表示します:',
    'It runs only when Tab is pressed, so heavy imports (an AWS SDK, say) stay out of `argv.tsx`. If it throws or takes longer than five seconds, completion falls back to no candidates rather than an error at the prompt.':
      'Tab を押したときにだけ実行されるので、重い import (AWS SDK など) を `argv.tsx` に持ち込まずに済みます。例外を投げたり 5 秒以上かかったりした場合は、プロンプトにエラーを出す代わりに候補なしとして扱います。',
  },
} satisfies PageTranslation;
