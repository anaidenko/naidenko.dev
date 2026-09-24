// Stops a deploy when a required environment variable is missing, so production never ships
// with a fallback value (for example Cloudflare's Turnstile test key, which real secrets reject).
// It reads the same .env files as `next build` in production mode, then the process environment.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const missing = process.argv.slice(2).filter(name => !process.env[name]);
if (missing.length > 0) {
    console.error(`Missing environment variable(s): ${missing.join(", ")}`);
    process.exit(1);
}
