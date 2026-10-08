// Usage: node scripts/check-build.mjs <out-dir> <test-env-file> [--toptal]
// Fails when the static export still carries a value from the test env file (Turnstile's test
// site key, the made-up GoatCounter endpoint): `pnpm test:e2e` leaves exactly such a build in out/.
// With --toptal it also fails the Toptal build on any way to reach Andrii but Toptal: an email
// address or a mailto link, naidenko.dev outside toptal.naidenko.dev, LinkedIn or the GitHub
// profile. The privacy note alone names privacy@naidenko.dev, as the GDPR asks (Art. 13).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseEnv } from "node:util";

const [outDir, envFile, flag] = process.argv.slice(2);
if (!outDir || !envFile || (flag && flag !== "--toptal")) {
    console.error("usage: node scripts/check-build.mjs <out-dir> <test-env-file> [--toptal]");
    process.exit(2);
}
const toptal = flag === "--toptal";

const testValues = Object.entries(parseEnv(readFileSync(envFile, "utf8"))).filter(([, value]) => value);

function* files(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) yield* files(path);
        else if ((toptal ? /\.(html|js|txt|json|md|xml|css|pdf)$/ : /\.(html|js|txt|json)$/).test(name)) yield path;
    }
}

/**
 * What in a Toptal build's file leads to Andrii outside Toptal. Each naidenko.dev is judged by what
 * precedes it, which also catches it inside escaped text such as \u003enaidenko.dev; a PDF is read
 * for its link targets, the one part of it not compressed.
 */
function contactsIn(name, text) {
    const found = new Set();
    const privacyNote = /^privacy(\.|\/)/.test(name);
    for (const { index } of text.matchAll(/naidenko\.dev/g)) {
        const before = text.slice(Math.max(0, index - 8), index);
        if (before.endsWith("toptal.") || (privacyNote && before === "privacy@")) continue;
        found.add(`${before.endsWith("@") ? "an address" : "naidenko.dev"} (…${before}naidenko.dev)`);
    }
    if (/mailto:/i.test(text)) found.add("mailto:");
    if (/linkedin\.com/i.test(text)) found.add("linkedin.com");
    if (/github\.com\/anaidenko(?![\w/-])/i.test(text)) found.add("the GitHub profile");
    return [...found];
}

let found = 0;
try {
    for (const path of files(outDir)) {
        const text = readFileSync(path, path.endsWith(".pdf") ? "latin1" : "utf8");
        const name = relative(outDir, path);
        for (const [key, value] of testValues) {
            if (text.includes(value)) {
                console.error(`${name} contains the test value of ${key}`);
                found += 1;
            }
        }
        if (!toptal) continue;
        for (const what of contactsIn(name, text)) {
            console.error(`${name} leads outside Toptal: ${what}`);
            found += 1;
        }
    }
} catch (error) {
    console.error(`Cannot read ${outDir}: ${error.message}`);
    process.exit(1);
}
if (found > 0) {
    console.error(
        toptal
            ? "The Toptal build must lead only to Toptal. Rebuild it before deploying."
            : "This is a test build. Rebuild with the production settings before deploying."
    );
    process.exit(1);
}
