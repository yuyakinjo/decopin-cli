import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'global-error.tsx',
  description: 'どの error.tsx も受け止めなかったときの最後のエラービュー。',
  blocks: {
    '`global-error.tsx` is the end of the [`error.tsx`](/inherited/error/) chain. It receives the same `ErrorProps`, and it is where a CLI decides how failures look when no subtree had an opinion.':
      '`global-error.tsx` は [`error.tsx`](/inherited/error/) の連鎖の終点です。同じ `ErrorProps` を受け取り、どのサブツリーも決めていないときに失敗をどう見せるかを CLI として決める場所です。',
    'Two things worth keeping in a custom view: `error.hints`, because they are the commands that fix the problem, and `error.issues`, because a validation failure can have more than one line.':
      '独自のビューでも残しておきたいものが 2 つあります。`error.hints` は問題を直すためのコマンドだから、`error.issues` は検証の失敗が複数行になることがあるからです。',
    'If `global-error.tsx` itself throws, the built-in view takes over, so an error view can never turn a failure into silence.':
      '`global-error.tsx` 自体が例外を投げた場合は組み込みのビューが引き継ぐので、エラービューのせいで失敗が無言になることはありません。',
  },
} satisfies PageTranslation;
