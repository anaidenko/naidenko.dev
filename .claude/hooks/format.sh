#!/usr/bin/env bash
# PostToolUse(Edit|Write): run Prettier on the file Claude just changed, so every edit lands formatted.
set -euo pipefail
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
    *.ts | *.tsx | *.mjs | *.js | *.css | *.json | *.jsonc | *.yml | *.yaml) ;;
    *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}"
pnpm exec prettier --write --log-level warn "$file" >/dev/null 2>&1 || true
