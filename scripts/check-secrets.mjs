// Usage: wrangler secret list | node scripts/check-secrets.mjs NAME...
// Fails unless every named Worker secret exists, so a deploy cannot ship a form that answers
// every visitor with an error.
import { readFileSync } from "node:fs";

const required = process.argv.slice(2);
let names;
try {
    names = new Set(JSON.parse(readFileSync(0, "utf8")).map(secret => secret.name));
} catch {
    console.error("Could not read the Worker's secrets. Run `pnpm exec wrangler login`, then set the secrets (README § Deploy).");
    process.exit(1);
}
const missing = required.filter(name => !names.has(name));
if (missing.length > 0) {
    console.error(`Missing Worker secret(s): ${missing.join(", ")}. Set them with \`pnpm exec wrangler secret put <NAME>\`.`);
    process.exit(1);
}
