import { describe, expect, it, vi } from "vitest";

import { type StatsData, type StatsDeps, handleStats } from "./stats";

const DATA: StatsData = {
    totals: { views: 120, views30: 40, views7: 9, leads: 3 },
    months: [{ label: "2026-09", n: 120 }],
    days: [{ label: "2026-09-24", n: 9 }],
    pages: [{ label: "/", n: 110 }],
    referrers: [{ label: "<script>alert(1)</script>", n: 5 }],
    countries: [{ label: "US", n: 70 }],
    devices: [{ label: "desktop", n: 80 }],
    events: [{ label: "hire_me_toptal · badge", n: 4 }]
};

function get(auth?: string) {
    return new Request("https://naidenko.dev/stats", { headers: auth ? { Authorization: auth } : {} });
}

const basic = (password: string) => `Basic ${btoa(`andrii:${password}`)}`;

function setup(overrides: Partial<StatsDeps> = {}): StatsDeps {
    return { password: "s3cret", load: vi.fn(async () => DATA), now: () => new Date("2026-09-24T12:00:00Z"), ...overrides };
}

describe("handleStats", () => {
    it("does not exist until a password is set", async () => {
        expect((await handleStats(get(basic("")), setup({ password: "" }))).status).toBe(404);
    });

    it("asks for the password, and refuses a wrong one", async () => {
        const missing = await handleStats(get(), setup());
        expect(missing.status).toBe(401);
        expect(missing.headers.get("WWW-Authenticate")).toContain("Basic");
        expect((await handleStats(get(basic("wrong")), setup())).status).toBe(401);
        expect((await handleStats(get("Bearer s3cret"), setup())).status).toBe(401);
    });

    it("shows the numbers to the owner, privately and unindexed", async () => {
        const deps = setup();
        const res = await handleStats(get(basic("s3cret")), deps);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
        expect(deps.load).toHaveBeenCalledWith("2026-08-26", "2026-09-18");
        const html = await res.text();
        for (const part of ["120", "2026-09", "hire_me_toptal · badge", "US", "desktop"]) expect(html).toContain(part);
    });

    it("escapes what visitors control", async () => {
        const html = await (await handleStats(get(basic("s3cret")), setup())).text();
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
});
