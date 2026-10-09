import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-links.mjs", import.meta.url));

function fixture(files: Record<string, string>) {
    const root = mkdtempSync(join(tmpdir(), "check-links-"));
    for (const [path, contents] of Object.entries(files)) {
        mkdirSync(join(root, path, ".."), { recursive: true });
        writeFileSync(join(root, path), contents);
    }
    return root;
}

const run = (dir: string) => spawnSync(process.execPath, [script, dir], { encoding: "utf8" });

const site = {
    "index.html":
        '<nav><a href="#about">About</a><a href="/audit">Audit</a><a href="/audit/sample?ref=x#F-004">F-004</a><a href="/">Home</a></nav>' +
        '<section id="about"><img src="/clients/a.jpg" alt=""/><a href="https://github.com/anaidenko">GH</a><a href="mailto:a@b.c">Mail</a></section>' +
        '<a href="/audit/sample-report.pdf">PDF</a>',
    "audit.html": '<a href="/privacy">Privacy</a>',
    "audit/sample.html": '<h3 id="F-004">F-004</h3><a href="#F-004">again</a><a href="sample-report.pdf">PDF, by a relative path</a>',
    "audit/sample-report.pdf": "%PDF",
    "privacy.html":
        '<p>Privacy</p><a href="https://naidenko.dev/audit">Audit</a><a href="https://toptal.naidenko.dev/audit/sample#F-004">F-004</a>',
    "clients/a.jpg": "jpeg"
};

describe("check-links", () => {
    it("passes a build whose every page, file and anchor exists", () => {
        const result = run(fixture(site));
        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
    });

    it("fails and names the page and the link that lead nowhere", () => {
        const result = run(
            fixture({
                ...site,
                "privacy.html": '<a href="/stats/old">Old</a><img src="/clients/missing.jpg" alt=""/><a href="#gone">Top</a>',
                "audit.html": '<a href="/audit/sample#F-999">F-999</a><a href="https://toptal.naidenko.dev/gone">Gone</a>'
            })
        );
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("privacy.html: /stats/old leads to no page or file");
        expect(result.stderr).toContain("privacy.html: /clients/missing.jpg leads to no page or file");
        expect(result.stderr).toContain("privacy.html: #gone names no element on its page");
        expect(result.stderr).toContain("audit.html: /audit/sample#F-999 names no element on its page");
        // The site's own hosts, written in full, are the build's to check: the Worker's daily check skips them.
        expect(result.stderr).toContain("audit.html: https://toptal.naidenko.dev/gone leads to no page or file");
    });

    it("fails when the build folder is missing", () => {
        expect(run(join(tmpdir(), "check-links-missing-folder")).status).toBe(1);
    });
});
