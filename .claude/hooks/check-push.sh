#!/bin/sh
# Claude Code PreToolUse hook (Bash): `git push` の直前に、**HEAD のクリーンな
# checkout** で bun run ci を回す。
#
# Stop hook (run-ci.sh) は作業ツリーで CI を回すので、ディスクにあるが
# git に無いファイル (未コミット / gitignore に巻き込まれた) に依存した
# テストは通ってしまう。CI が見るのは commit だけなので、ここでも commit
# だけを見る。app/publish/ が publish/ の無視規則に巻き込まれた事故で気づいた。

input=$(cat)

# git push 以外の Bash は素通し
case "$input" in
*'git push'*) ;;
*) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-.}"
cd "$root" || exit 0

tmp=$(mktemp -d 2>/dev/null) || exit 0
cleanup() {
  cd "$root" 2>/dev/null
  git worktree remove --force "$tmp" >/dev/null 2>&1
  rm -rf "$tmp"
}
trap cleanup EXIT

# 作業ツリーではなく HEAD の中身だけを取り出す
if ! git worktree add --detach "$tmp" HEAD >/dev/null 2>&1; then
  exit 0
fi
cd "$tmp" || exit 0

# 依存は本体のものを借りる (install を省く。lockfile は同じ)
ln -s "$root/node_modules" node_modules

if output=$(bun run ci 2>&1); then
  exit 0
fi

printf '%s\n' "$output" >&2
printf '\nHEAD のクリーンな checkout で bun run ci が失敗しました (作業ツリーでは通っていても)。\n' >&2
printf '未コミットのファイルや、.gitignore に巻き込まれたファイルにテストが依存していないか確かめてください:\n' >&2
printf '  git status --short\n  comm -13 <(git ls-files app | sort) <(find app -type f | sort)\n' >&2
exit 2
