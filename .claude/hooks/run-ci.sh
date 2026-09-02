#!/bin/sh
# Claude Code Stop hook: エージェントが応答を終えるときに bun run ci を実行する
# 失敗時は exit 2 で停止をブロックし、出力をエージェントに返す

input=$(cat)

# CI 実行後の再停止時は無限ループを避けるためスキップ
case "$input" in
*'"stop_hook_active"'*'true'*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if output=$(bun run ci 2>&1); then
  exit 0
fi

printf '%s\n' "$output" >&2
printf '\nbun run ci が失敗しました。エラーを修正してから終了してください。\n' >&2
exit 2
