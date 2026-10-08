import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-build.mjs", import.meta.url));

function fixture(files: Record<string, string>) {
    const root = mkdtempSync(join(tmpdir(), "check-build-"));
    writeFileSync(
        join(root, "test.env"),
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA\nNEXT_PUBLIC_GOATCOUNTER_URL=https://e2e-test.goatcounter.invalid/count\n"
    );
    for (const [path, contents] of Object.entries(files)) {
        mkdirSync(join(root, "out", path, ".."), { recursive: true });
        writeFileSync(join(root, "out", path), contents);
    }
    return root;
}

function run(root: string, ...flags: string[]) {
    return spawnSync(process.execPath, [script, join(root, "out"), join(root, "test.env"), ...flags], { encoding: "utf8" });
}

describe("check-build", () => {
    it("passes a build without test values", () => {
        expect(
            run(fixture({ "index.html": "<p>site key 0x4AAAAAAA</p>", "_next/app.js": "count('https://naidenko.goatcounter.com/count')" }))
                .status
        ).toBe(0);
    });

    it("fails and names the file that carries a test value", () => {
        const result = run(fixture({ "index.html": "<p>ok</p>", "_next/chunk.js": 'sitekey:"1x00000000000000000000AA"' }));
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("_next/chunk.js");
        expect(result.stderr).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
    });

    it("fails when the output folder is missing", () => {
        const root = mkdtempSync(join(tmpdir(), "check-build-"));
        writeFileSync(join(root, "test.env"), "X=1\n");
        expect(run(root).status).toBe(1);
    });
});

describe("check-build --toptal", () => {
    const clean = {
        "index.html":
            '<link rel="canonical" href="https://toptal.naidenko.dev"/><a href="https://github.com/anaidenko/auditdesk">Auditdesk</a>',
        "privacy.html": "<p>Write to privacy@naidenko.dev.</p>",
        "privacy/__next.privacy.__PAGE__.txt": "\\u003eprivacy@naidenko.dev\\u003c",
        "audit/sample.txt": "\\u003etoptal.naidenko.dev/audit\\u003c and bob@x.io",
        "audit/sample-report.pdf": "/URI (https://toptal.naidenko.dev/audit)",
        "_next/static/chunks/react.js": "search:!0,tel:!0,text:!0",
        "icon.svg": '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        "logo.png": "naidenko.dev hello@naidenko.dev"
    };

    it("passes a Toptal build that leads only to Toptal, the privacy note's and the sample's addresses aside", () => {
        const result = run(fixture(clean), "--toptal");
        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
    });

    it("fails on every way to reach Andrii outside Toptal, in any text file, naming the file", () => {
        for (const [path, contents, what] of [
            ["_next/static/chunks/a.js", '"hello@naidenko.dev"', "an address (hello@naidenko.dev)"],
            ["index.md", "Andrii.Naidenko@outlook.com", "an address (Andrii.Naidenko@outlook.com)"],
            ["audit.html", "privacy@naidenko.dev", "an address (privacy@naidenko.dev)"],
            ["index.html", '<a href="https://naidenko.dev/">', "naidenko.dev"],
            ["index.html", "Visit Naidenko.dev today", "naidenko.dev"],
            ["audit/sample.txt", "\\u003enaidenko.dev/audit\\u003c", "naidenko.dev"],
            ["audit/sample-report.pdf", "/URI (https://naidenko.dev/audit)", "naidenko.dev"],
            ["icon.svg", '<a href="https://naidenko.dev/">', "naidenko.dev"],
            ["_redirects", "/contact https://naidenko.dev/#contact 302", "naidenko.dev"],
            ["site.webmanifest", '{"start_url":"https://naidenko.dev/"}', "naidenko.dev"],
            ["index.html", '<a href="mailto:x@example.com">', "mailto:"],
            ["index.html", '<a href="tel:+302101234567">', "tel:"],
            ["index.html", '<a href="https://t.me/anaidenko">', "a messenger link"],
            ["llms.txt", "(https://www.linkedin.com/in/anaidenko/)", "linkedin.com"],
            ["index.html", '"sameAs":["https://github.com/anaidenko"]', "the GitHub profile"],
            ["index.html", '<a href="https://github.com/anaidenko/">', "the GitHub profile"]
        ]) {
            const result = run(fixture({ ...clean, [path]: contents }), "--toptal");
            expect(result.status, contents).toBe(1);
            expect(result.stderr, contents).toContain(`${path} leads outside Toptal: ${what}`);
        }
    });

    it("names a test build as one, not as a leak", () => {
        const result = run(fixture({ ...clean, "_next/app.js": "count('https://e2e-test.goatcounter.invalid/count')" }), "--toptal");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("This is a test build.");
        expect(result.stderr).not.toContain("lead only to Toptal");
    });

    it("leaves naidenko.dev's own build to the test values", () => {
        expect(run(fixture({ "index.html": '<a href="mailto:hello@naidenko.dev">' })).status).toBe(0);
    });
});
