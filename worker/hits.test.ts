import { describe, expect, it, vi } from "vitest";

import { type HitDeps, type HitRow, MAX_HIT_BYTES, deviceOf, handleHit, referrerHost } from "./hits";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

function hit(body: unknown, headers: Record<string, string> = {}) {
    return new Request("https://naidenko.dev/api/hit", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8", "User-Agent": CHROME, "Origin": "https://naidenko.dev", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body)
    });
}

function setup(overrides: Partial<HitDeps> = {}) {
    const rows: HitRow[] = [];
    const deps: HitDeps = {
        rateLimit: vi.fn(async (_key: string) => true),
        record: vi.fn(async (row: HitRow) => {
            rows.push(row);
        }),
        now: () => new Date("2026-09-24T21:30:00Z"),
        country: "GR",
        ...overrides
    };
    return { deps, rows };
}

describe("deviceOf", () => {
    it("tells phones, tablets and desktops apart", () => {
        expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
        expect(deviceOf("Mozilla/5.0 (Linux; Android 15; Pixel 7) Chrome/140.0 Mobile Safari/537.36")).toBe("mobile");
        expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
        expect(deviceOf("Mozilla/5.0 (Linux; Android 15; SM-X710) Chrome/140.0 Safari/537.36")).toBe("tablet");
        expect(deviceOf(CHROME)).toBe("desktop");
    });
});

describe("referrerHost", () => {
    it("keeps only the host of another site", () => {
        expect(referrerHost("https://www.linkedin.com/in/someone/?trk=x", "naidenko.dev")).toBe("linkedin.com");
        expect(referrerHost("https://www.toptal.com/developers/resume/andrii-naidenko", "naidenko.dev")).toBe("toptal.com");
    });

    it("drops the site's own pages, empty values and junk", () => {
        expect(referrerHost("https://naidenko.dev/privacy", "naidenko.dev")).toBe("");
        expect(referrerHost("https://www.naidenko.dev/", "naidenko.dev")).toBe("");
        expect(referrerHost("", "naidenko.dev")).toBe("");
        expect(referrerHost("not a url", "naidenko.dev")).toBe("");
        expect(referrerHost(42, "naidenko.dev")).toBe("");
    });
});

describe("handleHit", () => {
    it("counts a page view with its day, referring host, country and device", async () => {
        const { deps, rows } = setup();
        const res = await handleHit(hit({ kind: "view", name: "/", referrer: "https://www.google.com/" }), deps);
        expect(res.status).toBe(204);
        expect(rows).toEqual([
            { day: "2026-09-24", kind: "view", name: "/", detail: "", referrer: "google.com", country: "GR", device: "desktop" }
        ]);
    });

    it("counts an event with its detail and no referrer", async () => {
        const { deps, rows } = setup();
        await handleHit(hit({ kind: "event", name: "project_click", detail: "claude-video-digest", referrer: "https://x.com/" }), deps);
        expect(rows[0]).toMatchObject({ kind: "event", name: "project_click", detail: "claude-video-digest", referrer: "" });
    });

    it("ignores bots without counting them", async () => {
        const { deps, rows } = setup();
        const res = await handleHit(hit({ kind: "view", name: "/" }, { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }), deps);
        expect(res.status).toBe(204);
        expect(rows).toHaveLength(0);
    });

    it("refuses other sites, other methods and oversized or malformed bodies", async () => {
        const { deps, rows } = setup();
        expect((await handleHit(hit({ kind: "view", name: "/" }, { Origin: "https://evil.example" }), deps)).status).toBe(403);
        expect((await handleHit(new Request("https://naidenko.dev/api/hit"), deps)).status).toBe(405);
        expect((await handleHit(hit("x".repeat(MAX_HIT_BYTES + 1)), deps)).status).toBe(413);
        expect((await handleHit(hit("{not json"), deps)).status).toBe(400);
        expect((await handleHit(hit({ kind: "click", name: "/" }), deps)).status).toBe(400);
        expect((await handleHit(hit({ kind: "view", name: "<script>" }), deps)).status).toBe(400);
        expect((await handleHit(hit({ kind: "event", name: "x", detail: "<b>" }), deps)).status).toBe(400);
        expect(rows).toHaveLength(0);
    });

    it("limits hits per visitor address", async () => {
        const { deps, rows } = setup({ rateLimit: vi.fn(async () => false) });
        const res = await handleHit(hit({ kind: "view", name: "/" }, { "CF-Connecting-IP": "203.0.113.7" }), deps);
        expect(res.status).toBe(429);
        expect(deps.rateLimit).toHaveBeenCalledWith("hit:203.0.113.7");
        expect(rows).toHaveLength(0);
    });

    it("still answers 204 when the database write fails", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const { deps } = setup({
            record: vi.fn(async () => {
                throw new Error("D1_ERROR");
            })
        });
        expect((await handleHit(hit({ kind: "view", name: "/" }), deps)).status).toBe(204);
        expect(logged).toHaveBeenCalledWith("hit: record failed", expect.objectContaining({ message: "D1_ERROR" }));
        logged.mockRestore();
    });
});
