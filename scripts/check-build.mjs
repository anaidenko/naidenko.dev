// Usage: node scripts/check-build.mjs <out-dir> <test-env-file>
// Fails when the static export still carries a value from the test env file (Turnstile's test
// site key, the made-up GA4 ID): `pnpm test:e2e` leaves exactly such a build in out/.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseEnv } from "node:util";

const [outDir, envFile] = process.argv.slice(2);
if (!outDir || !envFile) {
    console.error("usage: node scripts/check-build.mjs <out-dir> <test-env-file>");
    process.exit(2);
}

const testValues = Object.entries(parseEnv(readFileSync(envFile, "utf8"))).filter(([, value]) => value);

function* files(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) yield* files(path);
        else if (/\.(html|js|txt|json)$/.test(name)) yield path;
    }
}

let found = 0;
try {
    for (const path of files(outDir)) {
        const text = readFileSync(path, "utf8");
        for (const [name, value] of testValues) {
            if (text.includes(value)) {
                console.error(`${relative(outDir, path)} contains the test value of ${name}`);
                found += 1;
            }
        }
    }
} catch (error) {
    console.error(`Cannot read ${outDir}: ${error.message}`);
    process.exit(1);
}
if (found > 0) {
    console.error("This is a test build. Rebuild with the production settings before deploying.");
    process.exit(1);
}
