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
- **End-to-end tests (Playwright):** `pnpm test:e2e` builds with `e2e/e2e.env` (public test
  keys) and runs against `wrangler dev` on port 8788, the real Worker with the static assets.
  Locally, a server already running on 8788 is reused.
- **Projects:** `desktop` (1440×900) and `mobile` (Pixel 7). When a test skips one, give the
  reason.
- **Analytics:** `e2e/analytics.spec.ts` stubs GoatCounter's count.js and watches the page's
  requests to `/api/hit`. The site's own counter writes to the local D1; the web server applies
  its migrations before `wrangler dev` starts.
- **Turnstile** uses Cloudflare's public test keys and needs network access. The email is only
  logged.
- **Scope locators to a section** (`section#contact`): Next.js injects its own `role="alert"`.
- **Accessibility:** `e2e/a11y.spec.ts` runs axe (WCAG 2.1 AA) on every page. Toptal's badge
  (`#r`) is excluded as third-party markup.
- **A test that passes before the change exists** is a finding about the test.
