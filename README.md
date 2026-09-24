# naidenko.dev

The personal site of Andrii Naidenko, a full-stack and mobile developer: one page with his
work, his open-source Claude Code plugins and a contact form.

## Stack

- **Next.js 16** (App Router) exported to static HTML, React 19, TypeScript
- **Tailwind CSS 4**, with the palette as CSS variables on `html[data-palette]`
- **Cloudflare Workers**: the static export is served as assets; one Worker route,
  `POST /api/contact`, checks Cloudflare Turnstile and mails the message with the Email
  Service binding
- **Vitest** for the Worker and the shared validation; **Playwright** and **axe** for
  end-to-end and accessibility tests in Chrome

## Run it

```bash
pnpm install
cp .dev.vars.example .dev.vars   # Cloudflare's public Turnstile test keys
pnpm build && pnpm preview       # the site plus the Worker on http://127.0.0.1:8788
```

`pnpm dev` runs the Next.js dev server on port 3000 for layout work. The contact form needs
the Worker, so test it with `pnpm preview`.

## Test

```bash
pnpm test        # validation and Worker unit tests
pnpm test:e2e    # builds, starts wrangler dev, runs Playwright and axe (desktop and mobile)
pnpm typecheck && pnpm lint
```

The end-to-end tests use Google Chrome (`channel: 'chrome'`) and reach
`challenges.cloudflare.com` for Turnstile's test keys.

## Deploy

1. Add the domain to Cloudflare. Enable Email Routing and verify the inbox that receives
   messages.
2. Create a Turnstile widget for the domain.
3. Set the secrets: `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY`, then `CONTACT_TO`.
4. Build with the real site key and deploy:
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key> pnpm run deploy`. Use `pnpm run`: a bare
   `pnpm deploy` is pnpm's own command. The script refuses to run without the site key, so
   production never ships with the test key.
5. Attach the domain to the Worker (Workers → Settings → Domains & Routes).

## Layout

| Path | What lives there |
|---|---|
| `src/content/` | All copy and links, one file per section |
| `src/components/` | One component per block of the page |
| `src/app/` | The home page, the privacy note and the 404 page |
| `src/lib/` | Form validation shared with the Worker; the Turnstile client |
| `worker/` | The Worker: the contact endpoint and Turnstile verification |
| `e2e/` | Playwright tests, accessibility checks, review screenshots |

## Credits

Layout inspired by [Brittany Chiang](https://brittanychiang.com)'s site; the code is
original. The frames in the claude-video-digest image are from Big Buck Bunny,
© Blender Foundation, CC BY 3.0.
