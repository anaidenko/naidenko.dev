---
description: Next.js 16 with static export, as used in this repository
paths:
    - src/app/**
    - next.config.ts
---

# Next.js in this repository

- **Read the docs in `node_modules/next/dist/docs/` before using an API.** Version 16 renamed
  and changed things; for example, `<Image preload>` replaced `priority`.
- **Static export only** (`output: "export"`). That rules out:
  - Server Actions and request-time APIs;
  - rewrites, redirects and headers in `next.config.ts`;
  - image optimization (`images.unoptimized` is on).

  Response headers go in `public/_headers`. Anything dynamic belongs in the Worker (`worker/`).
- **Route handlers are static:** GET only, with `export const dynamic = "force-static"`.
- **A generated image needs an extension in its route** (`src/app/og.png/route.tsx`). The
  `opengraph-image` and `icon` conventions export files without one, and the host then serves
  them with no Content-Type.
- **Declaring `icons` in `metadata` replaces the `icon.svg` file convention.** List every icon
  there.
- **`next/og` reads TTF, OTF and WOFF, not WOFF2.** Geist lives in `assets/fonts/`.
