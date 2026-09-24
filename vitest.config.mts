import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    test: {
        include: ["src/**/*.test.ts", "worker/**/*.test.ts", "scripts/**/*.test.ts"],
        environment: "node",
        // Under an AI agent Vitest defaults to its minimal reporter, which hides the stderr a person sees.
        reporters: process.env.GITHUB_ACTIONS === "true" ? ["default", "github-actions"] : ["default"]
    }
});
