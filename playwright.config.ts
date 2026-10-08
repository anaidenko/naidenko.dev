import { defineConfig, devices } from "@playwright/test";

import { BASE_URL, PORT, TOPTAL_PORT, TOPTAL_URL } from "./e2e/servers";

// E2E_PORT lets a second checkout run the suite while another one's servers hold 8788 and 8789.
const server = {
    env: { WRANGLER_SEND_METRICS: "false" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe"
} as const;

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
    webServer: [
        {
            // A page tagged ?ref=toptal… moves to the Toptal build's server, as it moves to the Toptal host in production.
            command: `[ -f .dev.vars ] || cp .dev.vars.example .dev.vars; pnpm exec wrangler d1 migrations apply naidenko-stats --local && pnpm exec wrangler dev --port ${PORT} --ip 127.0.0.1 --var TOPTAL_ORIGIN:${TOPTAL_URL}`,
            url: BASE_URL,
            ...server
        },
        {
            // Its visits reach the first server's Worker through the service binding, as in production.
            command: `pnpm exec wrangler dev -c wrangler.toptal.jsonc --port ${TOPTAL_PORT} --ip 127.0.0.1`,
            url: TOPTAL_URL,
            ...server
        }
    ]
});
