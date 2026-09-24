// Secrets live in Wrangler (production) or .dev.vars (local), not in wrangler.jsonc, so
// `wrangler types` sees them only when .dev.vars exists. Declaring them keeps a fresh checkout,
// such as CI, type-checking.
interface Env {
    TURNSTILE_SECRET_KEY: string;
    CONTACT_TO: string;
    SLACK_WEBHOOK_URL: string;
    STATS_PASSWORD: string;
}
