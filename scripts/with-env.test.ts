import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./with-env.mjs", import.meta.url));

function envFile(contents: string) {
    const file = join(mkdtempSync(join(tmpdir(), "with-env-")), "test.env");
    writeFileSync(file, contents);
    return file;
}

function run(file: string, env: Record<string, string> = {}) {
    return spawnSync(process.execPath, [script, file, process.execPath, "-e", "console.log(process.env.NAIDENKO_VALUE)"], {
        env: { PATH: process.env.PATH ?? "", NODE_ENV: "test", ...env },
        encoding: "utf8"
    });
}

describe("with-env", () => {
    it("runs the command with the file's variables", () => {
        const result = run(envFile("# comment\nNAIDENKO_VALUE=from-file\n"));
        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe("from-file");
    });

    it("lets the file win over the shell, so test builds are deterministic", () => {
        expect(run(envFile("NAIDENKO_VALUE=from-file\n"), { NAIDENKO_VALUE: "from-shell" }).stdout.trim()).toBe("from-file");
    });

    it("passes the command's exit code through", () => {
        const file = envFile("");
        const result = spawnSync(process.execPath, [script, file, process.execPath, "-e", "process.exit(3)"], { encoding: "utf8" });
        expect(result.status).toBe(3);
    });
});
