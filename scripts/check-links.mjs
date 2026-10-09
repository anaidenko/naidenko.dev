// Usage: node scripts/check-links.mjs <out-dir>
// Fails when a page of the static export links a page, file or anchor the export does not have:
// every <a href> and <img src> on the site's own hosts, by path and by #fragment. Outside links are
// the Worker's daily check (worker/links.ts).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const [outDir] = process.argv.slice(2);
if (!outDir) {
    console.error("usage: node scripts/check-links.mjs <out-dir>");
    process.exit(2);
}

const ORIGIN = "https://site.invalid";
/** The site's own hosts: a link to them written in full is checked here too, since the Worker's check skips them. */
const OWN_ORIGINS = ["https://naidenko.dev", "https://toptal.naidenko.dev"];

function* pages(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) yield* pages(path);
        else if (name.endsWith(".html")) yield path;
    }
}

/** The address a page is served at: index.html at /, audit/sample.html at /audit/sample. */
function addressOf(file) {
    const path = relative(outDir, file)
        .split(sep)
        .join("/")
        .replace(/\.html$/, "");
    return `/${path === "index" ? "" : path}`;
}

/** The file that serves a path, as Cloudflare's assets do: the file itself, <path>.html or <path>/index.html. */
function fileFor(pathname) {
    const path = decodeURIComponent(pathname).replace(/^\/+/, "");
    const candidates = path === "" ? ["index.html"] : [path, `${path}.html`, join(path, "index.html")];
    return candidates.map(candidate => join(outDir, candidate)).find(file => existsSync(file) && statSync(file).isFile());
}

const decode = value =>
    value
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;|&#39;/g, "'");
const idsIn = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match => decode(match[1])));

const htmlCache = new Map();
const read = file => {
    if (!htmlCache.has(file)) htmlCache.set(file, readFileSync(file, "utf8"));
    return htmlCache.get(file);
};

let broken = 0;
try {
    for (const file of pages(outDir)) {
        const html = read(file);
        const base = new URL(addressOf(file), ORIGIN);
        for (const [, , raw] of html.matchAll(/<(a|img)\b[^>]*?\s(?:href|src)="([^"]*)"/g)) {
            const value = decode(raw);
            const url = new URL(value, base);
            if (OWN_ORIGINS.includes(url.origin)) url.href = `${ORIGIN}${url.pathname}${url.search}${url.hash}`;
            if (url.origin !== ORIGIN) continue;
            const target = url.pathname === base.pathname ? file : fileFor(url.pathname);
            const name = relative(outDir, file);
            if (!target) {
                console.error(`${name}: ${value} leads to no page or file`);
                broken += 1;
            } else if (url.hash && target.endsWith(".html") && !idsIn(read(target)).has(decodeURIComponent(url.hash.slice(1)))) {
                console.error(`${name}: ${value} names no element on its page`);
                broken += 1;
            }
        }
    }
} catch (error) {
    console.error(`Cannot read ${outDir}: ${error.message}`);
    process.exit(1);
}
if (broken > 0) {
    console.error(`${broken} link${broken === 1 ? "" : "s"} in ${outDir} lead nowhere. Fix them before deploying.`);
    process.exit(1);
}
