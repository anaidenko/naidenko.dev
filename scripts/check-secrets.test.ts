import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-secrets.mjs", import.meta.url));

function run(input: string) {
    return spawnSync(process.execPath, [script, "TURNSTILE_SECRET_KEY", "CONTACT_TO"], { input, encoding: "utf8" });
}

describe("check-secrets", () => {
    it("passes when every secret is set", () => {
        const list = [
            { name: "CONTACT_TO", type: "secret_text" },
            { name: "TURNSTILE_SECRET_KEY", type: "secret_text" }
        ];
        expect(run(JSON.stringify(list)).status).toBe(0);
    });

    it("fails and names a missing secret", () => {
        const result = run(JSON.stringify([{ name: "CONTACT_TO", type: "secret_text" }]));
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("TURNSTILE_SECRET_KEY");
    });

    it("fails when the list cannot be read, for example before wrangler login", () => {
        expect(run("").status).toBe(1);
        expect(run("Not logged in").status).toBe(1);
    });
});
