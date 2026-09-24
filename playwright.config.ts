import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [["list"]],
    use: { baseURL: BASE_URL, trace: "retain-on-failure" },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
        { name: "mobile", use: { ...devices["Pixel 7"] } }
    ],
    webServer: {
        command: `[ -f .dev.vars ] || cp .dev.vars.example .dev.vars; pnpm exec wrangler d1 migrations apply naidenko-stats --local && pnpm exec wrangler dev --port ${PORT} --ip 127.0.0.1`,
        url: BASE_URL,
        env: { WRANGLER_SEND_METRICS: "false" },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe"
    }
});
