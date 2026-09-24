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
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA\nNEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST000000\n"
    );
    for (const [path, contents] of Object.entries(files)) {
        mkdirSync(join(root, "out", path, ".."), { recursive: true });
        writeFileSync(join(root, "out", path), contents);
    }
    return root;
}

function run(root: string) {
    return spawnSync(process.execPath, [script, join(root, "out"), join(root, "test.env")], { encoding: "utf8" });
}

describe("check-build", () => {
    it("passes a build without test values", () => {
        expect(run(fixture({ "index.html": "<p>site key 0x4AAAAAAA</p>", "_next/app.js": "gtag('config','G-REAL123')" })).status).toBe(0);
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
