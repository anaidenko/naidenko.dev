@AGENTS.md

# naidenko.dev

Andrii Naidenko's personal site: a Next.js static export plus one Cloudflare Worker for the
contact form. Commands and layout are in README.md.

## Rules

- **All copy lives in `src/content/`.** Every claim there must survive an interview
  question. The sources, and the rules the copy keeps, are in a private plan outside this
  repository: `../../.claude/plans/2026-09-24-personal-site-two-column.md`. Check it before adding or rewording a claim.
- **The Toptal badge is verbatim** (`src/content/toptal-badge.ts`). Do not edit or restyle
  it, and keep our CSS clear of `#r` and `.a`–`.h`.
- **No secrets in git.** `.dev.vars` is ignored; production values are Wrangler secrets.
- **Run `pnpm test`, `pnpm test:e2e`, `pnpm lint` and `pnpm typecheck` before a commit**
  that touches code.
- Commit messages and every file here are in English.
