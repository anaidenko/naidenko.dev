// Usage: node scripts/check-build.mjs <out-dir> <test-env-file> [--toptal]
// Fails when the static export still carries a value from the test env file (Turnstile's test
// site key, the made-up GoatCounter endpoint): `pnpm test:e2e` leaves exactly such a build in out/.
// With --toptal it also fails the Toptal build on any way to reach Andrii but Toptal, in every
// file but images and fonts: an email address, a mailto, tel or messenger link, naidenko.dev
// outside toptal.naidenko.dev, LinkedIn or the GitHub profile. The privacy note alone names
// privacy@naidenko.dev, as the GDPR asks (Art. 13).
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

/** Images and fonts; every other file is read as text, a PDF for its link targets, the one part of it not compressed. */
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i;

function* files(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) yield* files(path);
        else if (!BINARY.test(name)) yield path;
    }
}

/**
 * The addresses the Toptal build may carry: the privacy note's own, on its pages, and the made-up
 * ones in the sample report's evidence from OWASP Juice Shop.
 */
function allowedAddress(name, address) {
    if (address === "privacy@naidenko.dev") return /^privacy(\.|\/)/.test(name);
    return ["bob@x.io", "bab@x.ia"].includes(address) && name.startsWith("audit");
}

/**
 * What in a Toptal build's file leads to Andrii outside Toptal. Escaped text, such as the RSC
 * payload's <, is read as the characters it stands for; each naidenko.dev is judged by what
 * precedes it.
 */
function contactsIn(name, raw) {
    const text = raw.replace(/\\u00([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    const found = new Set();
    for (const { index } of text.matchAll(/naidenko\.dev/gi)) {
        const before = text.slice(Math.max(0, index - 8), index).toLowerCase();
        if (before.endsWith("toptal.") || before.endsWith("@")) continue;
        found.add(`naidenko.dev (…${before}${text.slice(index, index + 12)})`);
    }
    for (const [address] of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi))
        if (!allowedAddress(name, address.toLowerCase())) found.add(`an address (${address})`);
    if (/mailto:/i.test(text)) found.add("mailto:");
    if (/\btel:\s*[+\d]/i.test(text)) found.add("tel:");
    if (/\b(?:t\.me|wa\.me)\//i.test(text)) found.add("a messenger link");
    if (/linkedin\.com/i.test(text)) found.add("linkedin.com");
    if (/github\.com\/anaidenko\/?(?=["'\s<>)?#\\]|$)/i.test(text)) found.add("the GitHub profile");
    return [...found];
}

let testBuild = 0;
let contacts = 0;
try {
    for (const path of files(outDir)) {
        const text = readFileSync(path, path.endsWith(".pdf") ? "latin1" : "utf8");
        const name = relative(outDir, path);
        for (const [key, value] of testValues) {
            if (text.includes(value)) {
                console.error(`${name} contains the test value of ${key}`);
                testBuild += 1;
            }
        }
        if (!toptal) continue;
        for (const what of contactsIn(name, text)) {
            console.error(`${name} leads outside Toptal: ${what}`);
            contacts += 1;
        }
    }
} catch (error) {
    console.error(`Cannot read ${outDir}: ${error.message}`);
    process.exit(1);
}
if (testBuild > 0) console.error("This is a test build. Rebuild with the production settings before deploying.");
if (contacts > 0) console.error("The Toptal build must lead only to Toptal. Fix what it names before deploying.");
if (testBuild + contacts > 0) process.exit(1);
