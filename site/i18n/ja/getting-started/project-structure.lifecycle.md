<!-- lifecycle:start -->

すべてのファイルを置いた状態で `cli user show alice` を実行すると、次の順に呼ばれます。
パスは `app/` からの相対で、字下げした部分が `next()` の内側で動きます:

```
user/show/argv.tsx
env.tsx
middleware.tsx        before next()
  user/middleware.tsx before next()
    user/show/stdin.tsx
    user/show/data.tsx
    user/show/output.tsx
    user/show/cmd.tsx
  user/middleware.tsx after next()
middleware.tsx        after next()
layout.tsx
user/layout.tsx
user/show/shell.tsx
```

ほかの入り方では、もっと短い経路をたどります:

| 実行                            | 呼ばれるファイル (順番どおり)                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cli user show alice --json`    | `user/show/argv.tsx` → `env.tsx` → `middleware.tsx` → `user/middleware.tsx` → `user/show/stdin.tsx` → `user/show/data.tsx` → `user/show/output.tsx` → `user/show/shell.tsx`      |
| `cli user show alice --help`    | `user/show/argv.tsx` → `user/show/stdin.tsx` → `user/show/help.tsx` → `layout.tsx` → `user/layout.tsx`                                                                           |
| `cli user show alice --fail`    | `user/show/argv.tsx` → `env.tsx` → `middleware.tsx` → `user/middleware.tsx` → `user/show/stdin.tsx` → `user/show/data.tsx` → `user/error.tsx` → `layout.tsx` → `user/layout.tsx` |
| `cli user show alice --missing` | `user/show/argv.tsx` → `env.tsx` → `middleware.tsx` → `user/middleware.tsx` → `user/show/stdin.tsx` → `user/show/data.tsx` → `user/not-found.tsx`                                |
| `cli nope`                      | `not-found.tsx`                                                                                                                                                                  |
| `cli --version`                 | `version.tsx`                                                                                                                                                                    |
| `cli user show <Tab>`           | `user/show/argv.tsx` → `user/show/complete.tsx`                                                                                                                                  |

実際に動かした記録から `bun run docs:lifecycle` が生成しています。

<!-- lifecycle:end -->
