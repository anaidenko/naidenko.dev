import { describe, expect, it, vi } from "vitest";

import {
    type EventRow,
    type HitDeps,
    MAX_HIT_BYTES,
    MAX_SECONDS,
    type Place,
    type VisitRow,
    handleHit,
    placeOf,
    referrerHost
} from "./hits";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const VISIT = "0b6d4c52-7f0e-4c1a-9d3b-2e8f6a1c5d70";
const ADDRESS = "203.0.113.7";

const PLACE: Place = {
    country: "US",
    region: "Texas",
    city: "Austin",
    latitude: 30.27,
    longitude: -97.74,
    asn: 7922,
    network: "Comcast Cable Communications, LLC"
};

function hit(body: unknown, headers: Record<string, string> = {}) {
    return new Request("https://naidenko.dev/api/hit", {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=UTF-8",
            "User-Agent": CHROME,
            "Origin": "https://naidenko.dev",
            "Accept-Language": "en-US,en;q=0.9",
            "CF-Connecting-IP": ADDRESS,
            ...headers
        },
        body: typeof body === "string" ? body : JSON.stringify(body)
    });
}

function setup(overrides: Partial<HitDeps> = {}) {
    const visits: VisitRow[] = [];
    const events: EventRow[] = [];
    const times: [string, number][] = [];
    const deps: HitDeps = {
        rateLimit: vi.fn(async (_key: string) => true),
        recordVisit: vi.fn(async (row: VisitRow) => void visits.push(row)),
        recordEvent: vi.fn(async (row: EventRow) => void events.push(row)),
        recordTime: vi.fn(async (visit: string, seconds: number) => void times.push([visit, seconds])),
        now: () => new Date("2026-09-24T21:30:00Z"),
        place: PLACE,
        ignoredNetworks: "",
        visitorKey: "test-key",
        ...overrides
    };
    const recorded = () => visits.length + events.length + times.length;
    return { deps, visits, events, times, recorded };
}

const view = { kind: "view", visit: VISIT, path: "/", referrer: "https://www.linkedin.com/feed/", ref: "linkedin", screen: 1440 };

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

describe("placeOf", () => {
    it("takes the place and the network Cloudflare resolved from the address", () => {
        expect(
            placeOf({
                country: "US",
                region: "Texas",
                city: "Austin",
                latitude: "30.27",
                longitude: "-97.74",
                asn: 7922,
                asOrganization: "Comcast Cable Communications, LLC"
            })
        ).toEqual(PLACE);
    });

    it("leaves unknown parts empty", () => {
        const empty = { country: "", region: "", city: "", latitude: null, longitude: null, asn: null, network: "" };
        expect(placeOf(undefined)).toEqual(empty);
        expect(placeOf({ latitude: "north" })).toEqual(empty);
    });
});

describe("handleHit", () => {
    it("records a page view with what the Worker derives from the request", async () => {
        const { deps, visits } = setup();
        const res = await handleHit(hit(view), deps);
        expect(res.status).toBe(204);
        expect(visits).toEqual([
            {
                id: VISIT,
                at: "2026-09-24T21:30:00.000Z",
                day: "2026-09-24",
                visitor: expect.stringMatching(/^[0-9a-f]{32}$/),
                path: "/",
                referrer: "linkedin.com",
                ref: "linkedin",
                ...PLACE,
                device: "desktop",
                browser: "Chrome",
                os: "macOS",
                language: "en",
                screen: 1440
            }
        ]);
    });

    it("recognises no visitor without the key", async () => {
        const { deps, visits } = setup({ visitorKey: "" });
        await handleHit(hit({ ...view, ref: "", screen: null, referrer: "" }), deps);
        expect(visits[0]).toMatchObject({ visitor: null, ref: "", screen: null, referrer: "" });
    });

    it("records a click or a section for its visit", async () => {
        const { deps, events } = setup();
        await handleHit(hit({ kind: "event", visit: VISIT, name: "section_view", detail: "experience" }), deps);
        expect(events).toEqual([{ visit: VISIT, at: "2026-09-24T21:30:00.000Z", name: "section_view", detail: "experience" }]);
    });

    it("records the visible time, at most an hour", async () => {
        const { deps, times } = setup();
        await handleHit(hit({ kind: "time", visit: VISIT, seconds: 42 }), deps);
        await handleHit(hit({ kind: "time", visit: VISIT, seconds: 86_400 }), deps);
        expect(times).toEqual([
            [VISIT, 42],
            [VISIT, MAX_SECONDS]
        ]);
    });

    it("counts nothing from an ignored network", async () => {
        const { deps, recorded } = setup({ ignoredNetworks: "2a02:587:4f09:b700::/64, 203.0.113.0/24" });
        const res = await handleHit(hit(view), deps);
        expect(res.status).toBe(204);
        expect(recorded()).toBe(0);
    });

    it("counts a browser that chose on /stats to be counted, even from an ignored network", async () => {
        const { deps, visits, events } = setup({ ignoredNetworks: "203.0.113.0/24" });
        await handleHit(hit({ ...view, force: true }), deps);
        await handleHit(hit({ kind: "event", visit: VISIT, name: "contact_click", detail: "", force: true }), deps);
        expect(visits).toHaveLength(1);
        expect(events).toHaveLength(1);
    });

    it("ignores bots without counting them", async () => {
        const { deps, recorded } = setup();
        for (const userAgent of ["Mozilla/5.0 (compatible; Googlebot/2.1)", "curl/8.7.1", ""])
            expect((await handleHit(hit(view, { "User-Agent": userAgent }), deps)).status).toBe(204);
        expect(recorded()).toBe(0);
    });

    it("refuses other sites, other methods and oversized bodies", async () => {
        const { deps, recorded } = setup();
        expect((await handleHit(hit(view, { Origin: "https://evil.example" }), deps)).status).toBe(403);
        expect((await handleHit(new Request("https://naidenko.dev/api/hit"), deps)).status).toBe(405);
        expect((await handleHit(hit("x".repeat(MAX_HIT_BYTES + 1)), deps)).status).toBe(413);
        expect(recorded()).toBe(0);
    });

    it.each([
        ["not JSON", "{not json"],
        ["an unknown kind", { ...view, kind: "click" }],
        ["no visit", { ...view, visit: undefined }],
        ["a visit that is not a UUID", { ...view, visit: "123" }],
        ["a path with markup", { ...view, path: "<script>" }],
        ["a path without a slash", { ...view, path: "privacy" }],
        ["a ref with capitals or spaces", { ...view, ref: "Linked In" }],
        ["a screen that is not a width", { ...view, screen: "wide" }],
        ["an event detail with markup", { kind: "event", visit: VISIT, name: "x", detail: "<b>" }],
        ["an event without a name", { kind: "event", visit: VISIT, name: "", detail: "" }],
        ["negative seconds", { kind: "time", visit: VISIT, seconds: -1 }],
        ["fractional seconds", { kind: "time", visit: VISIT, seconds: 1.5 }],
        ["a choice to be counted that is not true or false", { ...view, force: "yes" }]
    ])("refuses %s", async (_case, body) => {
        const { deps, recorded } = setup();
        expect((await handleHit(hit(body), deps)).status).toBe(400);
        expect(recorded()).toBe(0);
    });

    it("drops hits over the per-address limit without an error status", async () => {
        const { deps, recorded } = setup({ rateLimit: vi.fn(async () => false) });
        const res = await handleHit(hit(view), deps);
        expect(res.status).toBe(204);
        expect(deps.rateLimit).toHaveBeenCalledWith(`hit:${ADDRESS}`);
        expect(recorded()).toBe(0);
    });

    it("still answers 204 when the database write fails", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const { deps } = setup({
            recordVisit: vi.fn(async () => {
                throw new Error("D1_ERROR");
            })
        });
        expect((await handleHit(hit(view), deps)).status).toBe(204);
        expect(logged).toHaveBeenCalledWith("hit: record failed", expect.objectContaining({ message: "D1_ERROR" }));
        logged.mockRestore();
    });
});
