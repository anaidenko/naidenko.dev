import { describe, expect, it, vi } from "vitest";

import { type Filter, type StatsData, type StatsDeps, filterOf, handleStats, renderStats } from "./stats";

const NOW = new Date("2026-09-24T12:00:00Z");

const EMPTY: StatsData = {
    totals: { visitors: 0, views: 0, homeViews: 0, returning: 0, avgSeconds: null, bounces: 0, leads: 0 },
    days: [],
    months: [],
    pages: [],
    refs: [],
    referrers: [],
    countries: [],
    regions: [],
    cities: [],
    networks: [],
    devices: [],
    browsers: [],
    systems: [],
    languages: [],
    screens: [],
    sections: [],
    nav: [],
    durations: [],
    events: [],
    recent: [],
    options: { countries: [], refs: [] }
};

const DATA: StatsData = {
    ...EMPTY,
    totals: { visitors: 31, views: 40, homeViews: 40, returning: 4, avgSeconds: 185, bounces: 10, leads: 3 },
    days: [{ label: "2026-09-24", visitors: 7, views: 9 }],
    months: [{ label: "2026-09", visitors: 31, views: 40 }],
    pages: [
        { label: "/", n: 29 },
        { label: "/privacy", n: 2 }
    ],
    refs: [{ label: "linkedin", n: 6 }],
    referrers: [{ label: "<script>alert(1)</script>", n: 5 }],
    countries: [
        { label: "KR", n: 2 },
        { label: "", n: 1 }
    ],
    regions: [{ country: "US", region: "Texas", city: "", n: 3 }],
    cities: [{ country: "US", region: "Texas", city: "Austin", n: 2 }],
    networks: [{ label: "Comcast Cable Communications, LLC", n: 3 }],
    devices: [{ label: "desktop", n: 30 }],
    browsers: [{ label: "Chrome", n: 25 }],
    systems: [{ label: "macOS", n: 12 }],
    languages: [{ label: "uk", n: 2 }],
    screens: [{ label: "1920 px and wider", n: 8 }],
    sections: [{ label: "experience", n: 20 }],
    nav: [{ label: "projects", n: 4 }],
    durations: [{ label: "1–3 min", n: 11 }],
    events: [{ label: "hire_me_toptal · badge", n: 4 }],
    recent: [
        {
            at: "2026-09-24T11:58:07.000Z",
            path: "/privacy",
            country: "US",
            region: "Texas",
            city: "Austin",
            network: "Comcast <b>Cable</b>",
            ref: "acme",
            referrer: "",
            device: "desktop",
            browser: "Chrome",
            os: "macOS",
            seconds: 185,
            returned: 1,
            sections: "about, experience",
            clicks: "contact_click"
        }
    ],
    options: { countries: ["KR", "US"], refs: ["acme", "linkedin"] }
};

const DEFAULT: Filter = { from: "2026-08-26", to: "2026-09-24", country: "", ref: "" };

function get(query = "", auth?: string) {
    return new Request(`https://naidenko.dev/stats${query}`, { headers: auth ? { Authorization: auth } : {} });
}

const basic = (password: string) => `Basic ${btoa(`andrii:${password}`)}`;

function setup(overrides: Partial<StatsDeps> = {}): StatsDeps {
    return { password: "s3cret", load: vi.fn(async () => DATA), now: () => NOW, ...overrides };
}

const filter = (query: string) => filterOf(new URL(`https://naidenko.dev/stats${query}`), NOW);

describe("filterOf", () => {
    it("shows the last 30 days of every country and tag by default", () => {
        expect(filter("")).toEqual(DEFAULT);
    });

    it("takes a preset range, or all time", () => {
        expect(filter("?range=7")).toMatchObject({ from: "2026-09-18", to: "2026-09-24" });
        expect(filter("?range=365")).toMatchObject({ from: "2025-09-25", to: "2026-09-24" });
        expect(filter("?range=all")).toMatchObject({ from: "", to: "2026-09-24" });
    });

    it("keeps all time when the form is sent with an empty start", () => {
        expect(filter("?from=&to=2026-09-24&country=US")).toEqual({ from: "", to: "2026-09-24", country: "US", ref: "" });
    });

    it("takes a date range, in either order", () => {
        expect(filter("?from=2026-09-01&to=2026-09-10")).toMatchObject({ from: "2026-09-01", to: "2026-09-10" });
        expect(filter("?from=2026-09-10&to=2026-09-01")).toMatchObject({ from: "2026-09-01", to: "2026-09-10" });
    });

    it("takes a country and a link tag", () => {
        expect(filter("?country=us&ref=LinkedIn")).toEqual({ ...DEFAULT, country: "US", ref: "linkedin" });
    });

    it("falls back to the defaults for anything malformed", () => {
        expect(filter("?from=2026-13-40&to=2026-09-10")).toEqual(DEFAULT);
        expect(filter("?from=2026-02-30&to=2026-03-01")).toEqual(DEFAULT);
        expect(filter("?range=1000000")).toEqual(DEFAULT);
        expect(filter("?country=U'S&ref=a%20b")).toEqual(DEFAULT);
    });
});

describe("renderStats", () => {
    it("shows the totals, with the average time and the bounce rate", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        for (const part of ["31", "40", "3 min 5 s", "25%", "Messages sent"]) expect(html).toContain(part);
    });

    it("names countries and languages instead of their codes", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        for (const part of ["South Korea", "Unknown", "Austin, Texas, United States", "Texas, United States", "Ukrainian"])
            expect(html).toContain(part);
    });

    it("lists the latest visits with their place, source, time and what they did", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        for (const part of ["2026-09-24 11:58", "?ref=acme", "about, experience", "contact_click", "Returning"])
            expect(html).toContain(part);
    });

    it("keeps the filter in the form and in the preset links", () => {
        const html = renderStats(DATA, { from: "2026-09-01", to: "2026-09-10", country: "US", ref: "acme" }, NOW);
        expect(html).toContain('name="from" value="2026-09-01"');
        expect(html).toContain('name="to" value="2026-09-10"');
        expect(html).toContain('<option value="US" selected>United States</option>');
        expect(html).toContain('<option value="acme" selected>acme</option>');
        expect(html).toContain('href="?range=7&amp;country=US&amp;ref=acme"');
    });

    it("lists the sections reached in the page's order, with their share of page views", () => {
        const sections = [
            { label: "contact", n: 10 },
            { label: "about", n: 40 },
            { label: "experience", n: 20 }
        ];
        const html = renderStats({ ...DATA, sections }, DEFAULT, NOW);
        const reached = html.slice(html.indexOf("Sections reached"), html.indexOf("Menu clicks"));
        expect(reached.indexOf("About")).toBeLessThan(reached.indexOf("Experience"));
        expect(reached.indexOf("Experience")).toBeLessThan(reached.indexOf("Contact"));
        expect(reached).toContain("40 · 100%");
    });

    it("measures section reach against home-page views only, and lists the pages", () => {
        const html = renderStats(
            { ...DATA, totals: { ...DATA.totals, views: 40, homeViews: 20 }, sections: [{ label: "about", n: 20 }] },
            DEFAULT,
            NOW
        );
        expect(html.slice(html.indexOf("Sections reached"), html.indexOf("Menu clicks"))).toContain("20 · 100%");
        expect(html.slice(html.indexOf("<h2>Pages"), html.indexOf("Link tags"))).toContain("/privacy");
        expect(html.slice(html.indexOf("Latest visits"))).toContain("/privacy");
    });

    it("escapes what visitors and networks control", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
        expect(html).toContain("Comcast &lt;b&gt;Cable&lt;/b&gt;");
    });

    it("renders an empty database", () => {
        const html = renderStats(EMPTY, DEFAULT, NOW);
        expect(html).toContain("Nothing yet");
        expect(html).toContain("—");
    });

    it("marks the owner's browser so neither counter counts it, and offers to undo it", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        expect(html).toContain('localStorage.setItem("skipgc", "t")');
        expect(html).toContain("Count it again");
    });
});

describe("handleStats", () => {
    it("does not exist until a password is set", async () => {
        expect((await handleStats(get("", basic("")), setup({ password: "" }))).status).toBe(404);
    });

    it("asks for the password, and refuses a wrong one", async () => {
        const missing = await handleStats(get(), setup());
        expect(missing.status).toBe(401);
        expect(missing.headers.get("WWW-Authenticate")).toContain("Basic");
        expect((await handleStats(get("", basic("wrong")), setup())).status).toBe(401);
        expect((await handleStats(get("", "Bearer s3cret"), setup())).status).toBe(401);
    });

    it("shows the filtered numbers to the owner, privately and unindexed", async () => {
        const deps = setup();
        const res = await handleStats(get("?range=7&country=KR", basic("s3cret")), deps);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
        expect(deps.load).toHaveBeenCalledWith({ from: "2026-09-18", to: "2026-09-24", country: "KR", ref: "" });
        expect(await res.text()).toContain("South Korea");
    });
});
