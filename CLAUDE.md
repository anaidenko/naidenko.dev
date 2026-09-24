@AGENTS.md

# naidenko.dev

Andrii Naidenko's personal site: a Next.js 16 static export served by one Cloudflare Worker,
which also answers the contact form. Setup, commands, configuration and deploy: README.md.

## Response style

- Be concise: short explanations, the focus on code.
- For a large change, describe the approach and wait for a "go" before writing it.
- Chat with Andrii in Russian. Everything committed is in English.

## Code

- **Prettier owns formatting:** 4 spaces, double quotes, sorted imports, sorted Tailwind
  classes. A hook formats every file Claude edits; run `pnpm format` after bulk changes.
- **Default to no comment.** A comment earns its place only by carrying what the code cannot: a
  platform constraint, a rejected alternative and why, or a magic value's source. Never narrate
  the change (`// was X`, `// fixed Y`).
- **Copy lives in `src/content/`**, never inline in components.
- **Next.js 16 differs from older versions.** Read `.claude/rules/nextjs.md` before touching
  `src/app/`.

## Content: the page is a public claim

- Every claim must survive an interview question.
- The sources, and the rules the copy keeps, are in a private plan outside this repository:
  `../../.claude/plans/2026-09-24-personal-site-two-column.md`. Read it before adding or
  rewording anything in `src/content/`.
- The Toptal badge (`src/content/toptal-badge.ts`) is verbatim. Never edit or restyle it.

## Factual rigor

- Before stating a checkable fact (a version, a limit, whether something exists or passes),
  verify it in the same turn and show the evidence: the command, the path or the quote.
- If you cannot verify it, say "unverified" and name what would confirm it.

## Workflow

- **Invoke Superpowers skills first:**
  - `brainstorming` for a new feature;
  - `writing-plans` for multi-step work;
  - `systematic-debugging` for any bug;
  - `verification-before-completion` before claiming done.
- **TDD for behaviour:** Vitest for logic, Playwright for the page. See
  `.claude/rules/testing.md`.
- **Before a commit that touches code:**
  `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`.
- **Commits** follow Conventional Commits (the `commit` skill). Work on a branch, not `main`.
- **Token budget:**
  - do not spawn subagents for work you can do directly;
  - never run agents in parallel to go faster;
  - do not have an agent double-check finished work unless asked.

## Permissions

- **Run local commands freely:** installs, builds, tests. Start `pnpm preview` in the
  background and leave it running.
- **Ask first** for anything that leaves this machine or is hard to undo: `git push`,
  `pnpm run deploy`, `wrangler secret`, `rm -rf`, `git reset --hard`, force-push.
- **No secrets in git.** `.dev.vars` and `.env*.local` are ignored. Production values are
  Wrangler secrets and build settings.

## Self-improvement

- After a correction that reveals a reusable pattern, record it without asking, and say so.
- Prefer, in order:
  1. a hook or test that makes the mistake impossible;
  2. sharpening the rule that already covers the moment;
  3. a new line here or in `.claude/rules/`.
- Write the rule, not its story.
