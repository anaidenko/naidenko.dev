import { describe, expect, it, vi } from "vitest";

import {
    type Filter,
    type StatsData,
    type StatsDeps,
    activePreset,
    chartSeries,
    filterOf,
    handleStats,
    niceCeiling,
    previousOf,
    renderStats,
    trend
} from "./stats";

const NOW = new Date("2026-09-24T12:00:00Z");

const EMPTY: StatsData = {
    totals: { visitors: 0, views: 0, homeViews: 0, returning: 0, avgSeconds: null, bounces: 0, timed: 0, leads: 0 },
    previous: null,
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
    totals: { visitors: 31, views: 40, homeViews: 40, returning: 4, avgSeconds: 185, bounces: 10, timed: 40, leads: 3 },
    previous: { visitors: 25, views: 40, homeViews: 40, returning: 4, avgSeconds: 200, bounces: 4, timed: 20, leads: 0 },
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

const DEFAULT: Filter = { from: "2026-09-18", to: "2026-09-24", country: "", ref: "" };

function get(query = "", auth?: string) {
    return new Request(`https://naidenko.dev/stats${query}`, { headers: auth ? { Authorization: auth } : {} });
}

const basic = (password: string) => `Basic ${btoa(`andrii:${password}`)}`;

function setup(overrides: Partial<StatsDeps> = {}): StatsDeps {
    return {
        password: "s3cret",
        load: vi.fn(async () => DATA),
        now: () => NOW,
        goatcounter: "https://naidenko.goatcounter.com/",
        ...overrides
    };
}

const filter = (query: string) => filterOf(new URL(`https://naidenko.dev/stats${query}`), NOW);

/** The part of a page from one marker to the next occurrence of another. */
const between = (html: string, from: string, to: string) => {
    const start = html.indexOf(from);
    return html.slice(start, html.indexOf(to, start));
};

describe("filterOf", () => {
    it("shows the last 7 days of every country and tag by default", () => {
        expect(filter("")).toEqual(DEFAULT);
    });

    it("takes a preset range, or all time", () => {
        expect(filter("?range=today")).toMatchObject({ from: "2026-09-24", to: "2026-09-24" });
        expect(filter("?range=yesterday")).toMatchObject({ from: "2026-09-23", to: "2026-09-23" });
        expect(filter("?range=7")).toMatchObject({ from: "2026-09-18", to: "2026-09-24" });
        expect(filter("?range=30")).toMatchObject({ from: "2026-08-26", to: "2026-09-24" });
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

describe("previousOf", () => {
    it("is the same number of days just before the range, with the same country and tag", () => {
        expect(previousOf({ ...DEFAULT, country: "US", ref: "cv" })).toEqual({
            from: "2026-09-11",
            to: "2026-09-17",
            country: "US",
            ref: "cv"
        });
        expect(previousOf({ ...DEFAULT, from: "2026-09-24", to: "2026-09-24" })).toMatchObject({ from: "2026-09-23", to: "2026-09-23" });
        expect(previousOf({ ...DEFAULT, from: "2026-09-01", to: "2026-09-10" })).toMatchObject({ from: "2026-08-22", to: "2026-08-31" });
    });

    it("does not exist for all time", () => {
        expect(previousOf({ ...DEFAULT, from: "" })).toBeNull();
    });
});

describe("trend", () => {
    it("shows the change in per cent, green when it grows", () => {
        expect(trend(12, 10)).toEqual({ arrow: "▲", text: "+20%", tone: "good" });
        expect(trend(8, 10)).toEqual({ arrow: "▼", text: "−20%", tone: "bad" });
        expect(trend(10, 10)).toEqual({ arrow: "", text: "0%", tone: "flat" });
    });

    it("marks growth from nothing as new, and nothing to nothing as flat", () => {
        expect(trend(5, 0)).toEqual({ arrow: "▲", text: "new", tone: "good" });
        expect(trend(0, 0)).toEqual({ arrow: "", text: "0%", tone: "flat" });
    });

    it("shows a rate's change in points, and red when a worse rate grows", () => {
        expect(trend(0.3, 0.25, { rate: true, lowerIsBetter: true })).toEqual({ arrow: "▲", text: "+5 pts", tone: "bad" });
        expect(trend(0.2, 0.25, { rate: true, lowerIsBetter: true })).toEqual({ arrow: "▼", text: "−5 pts", tone: "good" });
    });

    it("shows nothing without a previous value", () => {
        expect(trend(5, null)).toBeNull();
        expect(trend(null, 5)).toBeNull();
    });
});

describe("chartSeries", () => {
    it("fills the days without visits with zeros, oldest first", () => {
        const days = [
            { label: "2026-09-24", visitors: 3, views: 4 },
            { label: "2026-09-22", visitors: 1, views: 1 }
        ];
        expect(chartSeries(days, [], { ...DEFAULT, from: "2026-09-21" })).toEqual([
            { label: "2026-09-21", visitors: 0, views: 0 },
            { label: "2026-09-22", visitors: 1, views: 1 },
            { label: "2026-09-23", visitors: 0, views: 0 },
            { label: "2026-09-24", visitors: 3, views: 4 }
        ]);
    });

    it("starts all time at the first day with visits, and draws nothing without any", () => {
        const days = [{ label: "2026-09-23", visitors: 2, views: 2 }];
        expect(chartSeries(days, [], { ...DEFAULT, from: "" }).map(day => day.label)).toEqual(["2026-09-23", "2026-09-24"]);
        expect(chartSeries([], [], { ...DEFAULT, from: "" })).toEqual([]);
    });

    it("counts by month once the range is longer than a year", () => {
        const months = [
            { label: "2026-09", visitors: 30, views: 40 },
            { label: "2025-07", visitors: 5, views: 6 }
        ];
        const series = chartSeries([], months, { ...DEFAULT, from: "2025-07-10" });
        expect(series).toHaveLength(15);
        expect(series[0]).toEqual({ label: "2025-07", visitors: 5, views: 6 });
        expect(series[1]).toEqual({ label: "2025-08", visitors: 0, views: 0 });
        expect(series.at(-1)).toEqual({ label: "2026-09", visitors: 30, views: 40 });
    });
});

describe("niceCeiling", () => {
    it("rounds the chart's top up to 1, 2, 2.5 or 5 times a power of ten", () => {
        expect([0, 1, 3, 7, 14, 20, 101].map(niceCeiling)).toEqual([1, 1, 5, 10, 20, 20, 200]);
    });
});

describe("activePreset", () => {
    it("names the preset a filter matches, or none for a custom range", () => {
        expect(activePreset(DEFAULT, NOW)).toBe("7");
        expect(activePreset({ ...DEFAULT, from: "2026-09-24" }, NOW)).toBe("today");
        expect(activePreset({ ...DEFAULT, from: "2026-09-23", to: "2026-09-23" }, NOW)).toBe("yesterday");
        expect(activePreset({ ...DEFAULT, from: "2026-08-26" }, NOW)).toBe("30");
        expect(activePreset({ ...DEFAULT, from: "" }, NOW)).toBe("all");
        expect(activePreset({ ...DEFAULT, from: "2026-09-01", to: "2026-09-10" }, NOW)).toBe("");
    });
});

describe("the redesigned page", () => {
    it("draws visitors per day as columns, with the numbers in a tooltip and in a table", () => {
        const days = [
            { label: "2026-09-24", visitors: 7, views: 9 },
            { label: "2026-09-22", visitors: 14, views: 20 }
        ];
        const html = renderStats({ ...DATA, days }, DEFAULT, NOW);
        const chart = between(html, '<figure class="chart"', "</figure>");
        expect(chart).toContain('aria-label="Visitors per day, 2026-09-18 to 2026-09-24: 21 in total, most on 2026-09-22 (14)"');
        expect(chart.match(/class="col"/g)).toHaveLength(7);
        expect(chart).toContain('<i style="height: 70%"></i>');
        expect(chart).toContain('<i style="height: 35%"></i>');
        expect(chart).toContain('<span class="tip" style="bottom: 70%"><b>14</b> visitors · 20 views');
        expect(chart).toContain(">20</span>");
        expect(between(chart, '<div class="dates">', "</div>")).toContain('<span class="minor">');
        expect(between(html, "<details", "</details>")).toContain("Show the numbers");
    });

    it("draws each row's share of the largest as a bar", () => {
        const countries = [
            { label: "US", n: 4 },
            { label: "KR", n: 2 },
            { label: "", n: 1 }
        ];
        const table = between(renderStats({ ...DATA, countries }, DEFAULT, NOW), 'id="countries"', "</section>");
        for (const width of ["100%", "50%", "25%"]) expect(table).toContain(`<span class="bar" style="width: ${width}"></span>`);
    });

    it("groups the tables, and links the groups from a menu", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        const menu = between(html, '<nav class="jump"', "</nav>");
        for (const id of ["traffic", "sources", "audience", "technology", "engagement", "latest-visits"]) {
            expect(menu).toContain(`href="#${id}"`);
            expect(html).toContain(`<section id="${id}" class="group">`);
        }
    });

    it("shows the periods as buttons, the chosen one marked", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        expect(html).toContain('<a class="pill" href="?range=7" aria-current="page">7 days</a>');
        expect(html).toContain('<a class="pill" href="?range=30">30 days</a>');
        expect(renderStats(DATA, { ...DEFAULT, from: "2026-09-01", to: "2026-09-10" }, NOW)).not.toMatch(
            /<a class="pill"[^>]*aria-current/
        );
    });

    it("fits a visit on one line: a short time, the device, section dots and click chips", () => {
        const visit = { ...DATA.recent[0], path: "/", sections: "about, experience", clicks: "contact_click, profile_click · github" };
        const html = renderStats({ ...DATA, recent: [visit] }, DEFAULT, NOW);
        expect(html).toContain('<time title="2026-09-24 11:58:07 UTC">Sep 24, 11:58</time>');
        expect(html).toContain(
            '<span class="dots" title="About, Experience"><i class="on"></i><i class="on"></i><i></i><i></i><i></i></span>'
        );
        expect(html).toContain('<span class="chip">contact_click</span><span class="chip">profile_click · github</span>');
        expect(html).toContain("Chrome · macOS");
    });

    it("shows the latest 20 visits, and the rest on request", () => {
        const recent = Array.from({ length: 26 }, (_, index) => ({
            ...DATA.recent[0],
            at: `2026-09-24T11:${String(59 - index).padStart(2, "0")}:00.000Z`
        }));
        const html = renderStats({ ...DATA, recent }, DEFAULT, NOW);
        const shown = between(html, '<tbody id="visits">', "</tbody>");
        const more = between(html, '<tbody id="more-visits" hidden>', "</tbody>");
        expect(shown.match(/<tr>/g)).toHaveLength(20);
        expect(more.match(/<tr>/g)).toHaveLength(6);
        expect(html).toContain("Show all 26");
        expect(renderStats(DATA, DEFAULT, NOW)).not.toContain("more-visits");
    });
});

describe("renderStats", () => {
    it("says it is the stats page", () => {
        expect(renderStats(DATA, DEFAULT, NOW)).toContain("<h1>naidenko.dev stats</h1>");
    });

    it("compares each total with the previous period", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        expect(html).toContain(
            '<small class="trend good" title="2026-09-11 to 2026-09-17: 25"><span aria-hidden="true">▲</span> +24%</small>'
        );
        expect(html).toContain('class="trend bad" title="2026-09-11 to 2026-09-17: 3 min 20 s"');
        expect(html).toContain('class="trend bad" title="2026-09-11 to 2026-09-17: 20%"><span aria-hidden="true">▲</span> +5 pts');
        expect(html).toContain("Arrows compare with 2026-09-11 to 2026-09-17.");
        expect(renderStats({ ...DATA, previous: null }, { ...DEFAULT, from: "" }, NOW)).not.toContain('class="trend');
    });

    it("offers today and yesterday first, and names the countries in alphabetical order", () => {
        const html = renderStats({ ...DATA, options: { countries: ["US", "KR", "DE"], refs: [] } }, DEFAULT, NOW);
        expect(html.indexOf(">Today<")).toBeLessThan(html.indexOf(">Yesterday<"));
        expect(html.indexOf(">Yesterday<")).toBeLessThan(html.indexOf(">7 days<"));
        expect(html.indexOf(">Germany<")).toBeLessThan(html.indexOf(">South Korea<"));
        expect(html.indexOf(">South Korea<")).toBeLessThan(html.indexOf(">United States<"));
    });

    it("gives every table an anchor to link to", () => {
        const html = renderStats(DATA, DEFAULT, NOW);
        expect(html).toContain('<section id="latest-visits" class="group"><h2><a href="#latest-visits">Latest visits</a></h2>');
        expect(html).toContain('<section id="link-tags-ref" class="card"><h3><a href="#link-tags-ref">Link tags (?ref=)</a></h3>');
    });

    it("links to GoatCounter for the same period, when it is configured", () => {
        const goatcounter = "https://naidenko.goatcounter.com/";
        expect(renderStats(DATA, DEFAULT, NOW, goatcounter)).toContain(
            'href="https://naidenko.goatcounter.com/?period-start=2026-09-18&amp;period-end=2026-09-24"'
        );
        expect(renderStats(DATA, { ...DEFAULT, from: "" }, NOW, goatcounter)).toContain('href="https://naidenko.goatcounter.com/"');
        expect(renderStats(DATA, DEFAULT, NOW)).not.toContain("goatcounter.com");
    });

    it("defines a bounce as leaving within 10 seconds", () => {
        expect(renderStats(DATA, DEFAULT, NOW)).toContain("A bounce is a visit that left within 10 s.");
    });

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
        for (const part of ["2026-09-24 11:58", "?ref=acme", "contact_click", "Returning"]) expect(html).toContain(part);
    });

    it("keeps the filter in the form and in the preset links", () => {
        const html = renderStats(DATA, { from: "2026-09-01", to: "2026-09-10", country: "US", ref: "acme" }, NOW);
        expect(html).toContain('name="from" value="2026-09-01"');
        expect(html).toContain('name="to" value="2026-09-10"');
        expect(html).toContain('<option value="US" selected>United States</option>');
        expect(html).toContain('<option value="acme" selected>acme</option>');
        expect(html).toContain('href="?range=7&amp;country=US&amp;ref=acme"');
        expect(html).toContain('href="?range=today&amp;country=US&amp;ref=acme"');
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
        expect(html.slice(html.indexOf('id="pages"'), html.indexOf('id="link-tags-ref"'))).toContain("/privacy");
        expect(html.slice(html.indexOf('id="latest-visits"'))).toContain("/privacy");
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
        const html = await res.text();
        expect(html).toContain("South Korea");
        expect(html).toContain("https://naidenko.goatcounter.com/?period-start=2026-09-18");
    });
});
