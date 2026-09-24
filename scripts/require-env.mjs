// Stops a deploy when a required environment variable is missing, so production never ships
// with a fallback value (for example Cloudflare's Turnstile test key, which real secrets reject).
const missing = process.argv.slice(2).filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}
