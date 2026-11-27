import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'middleware.tsx',
  description:
    'ディレクトリより下のすべてのコマンドの実行を包みます。next() を呼ぶまで何も動きません。',
  blocks: {
    '`middleware.tsx` wraps the execution. It is inherited like `layout.tsx`, and `next` is a function, so nothing inside runs until you call it. That is what makes "after the command" possible: timing, cleanup, or deciding not to run at all.':
      '`middleware.tsx` は実行を包みます。`layout.tsx` と同じく継承され、`next` は関数なので、呼ぶまで内側は何も動きません。だからこそ「コマンドの後」が書けます。時間を測る、後片付けをする、あるいは実行しないと決める、といったことです。',
    'Middleware receives the same validated `args`, `options`, `env` and `dryRun` the command does, typed loosely (`Record<string, unknown>`) because one file serves many commands.':
      'middleware はコマンドと同じ検証済みの `args`、`options`、`env`、`dryRun` を受け取ります。1 つのファイルが多くのコマンドに効くので、型はゆるく (`Record<string, unknown>`) なっています。',
    '## Order': '## 順番',
    'Outer directories run first. `app/middleware.tsx` calls `next()`, which runs `app/user/middleware.tsx`, which calls `next()`, which runs the command. Returning without calling `next()` skips everything inside.':
      '外側のディレクトリが先に動きます。`app/middleware.tsx` が `next()` を呼ぶと `app/user/middleware.tsx` が動き、それが `next()` を呼ぶとコマンドが動きます。`next()` を呼ばずに返すと、内側はすべて飛ばされます。',
    '## Why next() and not children': '## なぜ children ではなく next() なのか',
    'A `children` prop would mean the command has already run by the time the middleware sees it. The decision is recorded as ADR 13 in [docs/decisions.md](https://github.com/yuyakinjo/decopin-cli/blob/main/docs/decisions.md).':
      '`children` prop だと、middleware がそれを見る時点でコマンドはすでに実行済みになってしまいます。この判断は [docs/decisions.md](https://github.com/yuyakinjo/decopin-cli/blob/main/docs/decisions.md) の ADR 13 に記録しています。',
  },
} satisfies PageTranslation;
