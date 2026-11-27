import type { PageTranslation } from '../../../i18n.ts';

export default {
  title: 'env.tsx',
  description:
    'CLI が読む環境変数をすべて 1 つのファイルに。起動時に一度だけ検証し、型を付けます。',
  blocks: {
    'Environment variables are the input nobody documents. They are read wherever `process.env` happens to be mentioned, parsed as strings, and a missing or misspelled one surfaces as a failure far from its cause. `env.tsx` is root-only: one file lists every variable the CLI reads, and it is checked once, before any command runs.':
      '環境変数は誰も文書化しない入力です。`process.env` が書かれた場所でばらばらに読まれ、文字列として解釈され、無かったり綴りを間違えたりすると原因から遠く離れた場所で失敗として表に出ます。`env.tsx` はルート専用ファイルです。CLI が読むすべての変数を 1 つのファイルに並べ、どのコマンドよりも先に一度だけ検査します。',
    '`<Var>` takes the same `Type.*` children and `type` shorthand as `<Option>`. `required` and `default` follow the same rule: at most one of them, and with neither the variable is optional.':
      '`<Var>` は `<Option>` と同じ `Type.*` の子要素と `type` の省略記法を受け取ります。`required` と `default` も同じ規則で、指定できるのはどちらか一方まで、どちらも無ければその変数は省略可能です。',
    '## The env prop': '## env prop',
    'Every command receives the validated result as `env`, already converted and typed. A variable with a `default` is never `undefined`; one without is optional, and the type says so:':
      'すべてのコマンドは検証済みの結果を `env` として受け取ります。変換も型付けも済んだ状態です。`default` のある変数は決して `undefined` にならず、無い変数は省略可能で、型もそれを表します:',
    'The same `env` reaches `data.tsx`, `middleware.tsx` and `shell.tsx`. The generated type is a module augmentation of `EnvVars`, so `env.DECOPIN_LGO` is a compile error.':
      '同じ `env` が `data.tsx`、`middleware.tsx`、`shell.tsx` にも届きます。生成される型は `EnvVars` のモジュール拡張なので、`env.DECOPIN_LGO` はコンパイルエラーになります。',
    '## Failing fast': '## 早く失敗する',
    'A bad value fails before the command, and says which variable and why. With `--json` the same failure is structured (`code: "env"`), so a script calling the CLI can tell a setup problem from a runtime one:':
      '不正な値はコマンドより前に失敗し、どの変数がなぜ駄目なのかを伝えます。`--json` では同じ失敗が構造化される (`code: "env"`) ので、CLI を呼ぶスクリプトは環境設定の問題と実行時の問題を区別できます:',
    'The message names the variable and what was expected, never the value it found. An environment variable is often a secret, and the error travels further than the terminal: into CI logs, and over [MCP](/guides/mcp/) to whoever called the tool.':
      'メッセージに出るのは変数名と期待した内容だけで、読み取った値は決して出しません。環境変数は秘密であることが多く、エラーは端末より遠くまで届くからです。CI のログへ、そして [MCP](/guides/mcp/) 越しにツールを呼んだ相手へ。',
    'Reading `process.env` directly still works. The point of the file is that the list of what the CLI depends on exists, in one place, and that the type checker enforces it.':
      '`process.env` を直接読むこともできます。このファイルの意義は、CLI が何に依存しているかの一覧が 1 か所に存在し、それを型チェッカーが守らせることにあります。',
    'For variables that are not configuration but credentials, pair `env.tsx` with [`authRequired()`](/guides/setup-errors/), which tells the user the command that fixes it.':
      '設定ではなく認証情報にあたる変数には、`env.tsx` と [`authRequired()`](/guides/setup-errors/) を組み合わせてください。直すためのコマンドを利用者に伝えられます。',
  },
} satisfies PageTranslation;
