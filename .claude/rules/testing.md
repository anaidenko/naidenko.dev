---
description: How tests are written and run in this repository
paths:
    - e2e/**
    - "**/*.test.ts"
    - playwright.config.ts
    - vitest.config.mts
---

# Testing

- **Unit tests (Vitest)** sit next to the code as `*.test.ts` and run in Node. Keep logic in
  plain functions with injected dependencies, as `worker/contact.ts` does, so it can be tested
  without a browser or Cloudflare.
- **End-to-end tests (Playwright):** `pnpm test:e2e` builds both builds with `e2e/e2e.env`
  (public test keys) and runs against two `wrangler dev` servers: the site on 8788 and the Toptal
  build on 8789 (`e2e/servers.ts`; `E2E_PORT` moves both). Locally, a server already running on
  either port is reused, so a `pnpm preview` left running from another checkout is tested instead
  of this build: check `lsof -iTCP:8788 -sTCP:LISTEN` first and pass `E2E_PORT=8790` if it is
  taken. After editing `worker/`, restart them: a hot reload dropped the rate-limit bindings on
  2026-09-24, and `/api/hit` answered 500.
  One spec: `pnpm test:e2e e2e/analytics.spec.ts -g "<title>"` (it still builds first); calling
  `scripts/with-env.mjs … next build` outside a pnpm script fails with ENOENT, since `next` is
  on the PATH only inside one.
- **The Toptal build's service binding** reaches whichever `naidenko-dev` dev session the local
  dev registry names, another checkout's included (2026-10-08: a hit went to a two-day-old
  preview's D1). So the e2e tests check what the page sends, not what lands in the database.
- **The Worker never sees a test's host:** `wrangler dev` rewrites `request.url` and `Host` to
  the first route's host, `naidenko.dev` (checked on 2026-10-08). So a host check in `worker/` is
  unit-tested, and checked with `curl` after the deploy. The Toptal build knows it is one from its
  build variable, not its host, so its tests run on `127.0.0.1`.
- **Projects:** `desktop` (1440×900) and `mobile` (Pixel 7). When a test skips one, give the
  reason.
- **Analytics:** `e2e/analytics.spec.ts` stubs GoatCounter's count.js and watches the page's
  requests to `/api/hit`. The site's own counter writes to the local D1; the web server applies
  its migrations before `wrangler dev` starts. The local D1 persists across runs, so assert
  that a count grows, not that a fresh row shows in a top-N table.
- **Turnstile** uses Cloudflare's public test keys and needs network access. The email is only
  logged.
- **Scope locators to a section** (`section#contact`): Next.js injects its own `role="alert"`.
- **Accessibility:** `e2e/a11y.spec.ts` runs axe (WCAG 2.1 AA) on every page. Toptal's badge
  (`#r`) is excluded as third-party markup.
- **A test that passes before the change exists** is a finding about the test. A red run counts
  only when the message shows the failure under test: on 2026-09-24 a "red" 429 check was a 500
  from a stale server.
