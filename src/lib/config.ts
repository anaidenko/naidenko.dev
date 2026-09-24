/**
 * Cloudflare's always-pass test key is the fallback so local builds work. A production build
 * must set NEXT_PUBLIC_TURNSTILE_SITE_KEY; with the test key a real secret rejects every token.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
