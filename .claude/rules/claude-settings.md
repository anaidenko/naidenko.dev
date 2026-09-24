---
description: Conventions for .claude/settings.json and .claude/settings.local.json
paths:
    - .claude/settings.json
    - .claude/settings.local.json
---

# Claude Code settings

- **Shared vs personal:** `.claude/settings.json` is shared and committed; it holds the
  permission lists and the format hook. `.claude/settings.local.json` is personal and ignored.
- **Format:** 4-space JSON, formatted by Prettier like everything else.
- **Keep `permissions.allow` and `permissions.ask` sorted,** so diffs stay readable:
  `jq '.permissions.allow |= sort | .permissions.ask |= sort' .claude/settings.json`.
- **Deploys, pushes and secrets stay in `ask`,** never in `allow`.
