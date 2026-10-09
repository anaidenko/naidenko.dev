import { describe, expect, it, vi } from "vitest";

import { checkLink, isUnchecked, linksForDay, linksIn, pagesIn, runLinkCheck } from "./links";

type Reply = number | [number, string] | Error;

/** A fetch that answers each URL from a table: a status, a redirect [status, location], or an error to throw. */
function fakeFetch(table: Record<string, Reply | Reply[]>) {
    const calls: string[] = [];
    const seen: Record<string, number> = {};
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(url);
        expect(init?.redirect).toBe("manual");
        const entry = table[url] ?? 200;
        const replies = Array.isArray(entry) && typeof entry[0] !== "number" ? (entry as Reply[]) : [entry as Reply];
        const reply = replies[Math.min(seen[url] ?? 0, replies.length - 1)];
        seen[url] = (seen[url] ?? 0) + 1;
        if (reply instanceof Error) throw reply;
        const [status, location] = typeof reply === "number" ? [reply, undefined] : reply;
        return new Response(status >= 300 && status < 400 ? null : "body", { status, headers: location ? { Location: location } : {} });
    });
    return { fetchImpl, calls };
}

describe("linksIn", () => {
    it("finds the page's outside links once each, with &amp; read as &", () => {
        const html =
            '<a href="https://github.com/anaidenko">GH</a><a class="x" href="https://play.google.com/store/apps/details?id=a&amp;hl=en">Play</a>' +
            '<a href="/audit">Audit</a><a href="#about">About</a><a href="mailto:a@b.c">Mail</a><a href="https://github.com/anaidenko">again</a>' +
            '<link rel="canonical" href="https://naidenko.dev"/><img src="https://example.com/a.png"/>';
        expect(linksIn(html)).toEqual(["https://github.com/anaidenko", "https://play.google.com/store/apps/details?id=a&hl=en"]);
    });
});

describe("pagesIn", () => {
    it("reads the sitemap's pages as paths", () => {
        const sitemap =
            "<urlset><url><loc>https://naidenko.dev</loc></url><url><loc>https://naidenko.dev/audit/sample</loc></url></urlset>";
        expect(pagesIn(sitemap)).toEqual(["/", "/audit/sample"]);
    });
});

describe("isUnchecked", () => {
    it("leaves out LinkedIn, which answers 999 to any script, Toptal, whose terms bar scripts, and the site itself", () => {
        for (const url of [
            "https://www.linkedin.com/in/nicholas--murphy/",
            "https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7",
            "https://naidenko.dev/audit",
            "https://toptal.naidenko.dev/audit"
        ])
            expect(isUnchecked(url), url).toBe(true);
        for (const url of ["https://github.com/anaidenko", "https://notlinkedin.com/", "https://uploads.toptal.io/terms.pdf"])
            expect(isUnchecked(url), url).toBe(false);
    });
});

describe("linksForDay", () => {
    const rotating = ["r1", "r2", "r3", "r4", "r5"];

    it("checks the home page's links every day and a turn of the others", () => {
        expect(linksForDay(["h1", "h2"], rotating, 0, 2)).toEqual(["h1", "h2", "r1", "r2"]);
        expect(linksForDay(["h1", "h2"], rotating, 1, 2)).toEqual(["h1", "h2", "r3", "r4"]);
        expect(linksForDay(["h1", "h2"], rotating, 2, 2)).toEqual(["h1", "h2", "r5", "r1"]);
    });

    it("reaches every link within a few days", () => {
        const seen = new Set([0, 1, 2].flatMap(day => linksForDay([], rotating, day, 2)));
        expect([...seen].sort()).toEqual(rotating);
    });

    it("takes no link twice when the turn is longer than the list", () => {
        expect(linksForDay([], ["r1", "r2"], 3, 15)).toEqual(["r2", "r1"]);
        expect(linksForDay(["h1"], [], 3, 15)).toEqual(["h1"]);
    });
});

describe("checkLink", () => {
    const check = (url: string, table: Record<string, Reply | Reply[]>, budget = { left: 10 }) => {
        const { fetchImpl, calls } = fakeFetch(table);
        return checkLink(url, fetchImpl, budget).then(outcome => ({ outcome, calls, budget }));
    };

    it("passes a link that answers 200, and follows its redirects", async () => {
        const { outcome, calls } = await check("https://a.test/old", { "https://a.test/old": [301, "/new"], "https://a.test/new": 200 });
        expect(outcome).toMatchObject({ status: "ok" });
        expect(calls).toEqual(["https://a.test/old", "https://a.test/new"]);
    });

    it("calls a 404 or a 410 broken, after one more try", async () => {
        for (const status of [404, 410]) {
            const { outcome, calls } = await check("https://a.test/", { "https://a.test/": status });
            expect(outcome).toMatchObject({ status: "broken", reason: String(status) });
            expect(calls).toHaveLength(2);
        }
    });

    it("passes a link that failed once and answered the second time", async () => {
        const { outcome } = await check("https://a.test/", { "https://a.test/": [new TypeError("fetch failed"), 200] });
        expect(outcome).toMatchObject({ status: "ok" });
    });

    it("calls a network error or a timeout broken", async () => {
        const dns = await check("https://gone.test/", { "https://gone.test/": new TypeError("DNS lookup failed") });
        expect(dns.outcome).toMatchObject({ status: "broken", reason: "network error: DNS lookup failed" });
        const slow = await check("https://slow.test/", {
            "https://slow.test/": new DOMException("The operation timed out.", "TimeoutError")
        });
        expect(slow.outcome).toMatchObject({ status: "broken", reason: "timeout" });
    });

    it("does not call a bot wall broken: 403, 429, 503 and the like stay unverified, with no second try", async () => {
        for (const status of [401, 403, 429, 500, 503]) {
            const { outcome, calls } = await check("https://walled.test/", { "https://walled.test/": status });
            expect(outcome, String(status)).toMatchObject({ status: "unverified", reason: String(status) });
            expect(calls).toHaveLength(1);
        }
    });

    it("calls a redirect loop broken", async () => {
        const { outcome } = await check(
            "https://loop.test/a",
            { "https://loop.test/a": [302, "/b"], "https://loop.test/b": [302, "/a"] },
            { left: 100 }
        );
        expect(outcome).toMatchObject({ status: "broken", reason: "too many redirects" });
    });

    it("spends one request of the budget per hop, and skips a link once the budget is gone", async () => {
        const budget = { left: 2 };
        const first = await check("https://a.test/old", { "https://a.test/old": [301, "/new"] }, budget);
        expect(first.outcome).toMatchObject({ status: "ok" });
        expect(budget.left).toBe(0);
        const second = await check("https://b.test/", {}, budget);
        expect(second.outcome).toMatchObject({ status: "skipped" });
        expect(second.calls).toEqual([]);
    });

    it("skips, not breaks, a link the runtime refused for too many subrequests", async () => {
        const { outcome } = await check("https://a.test/", { "https://a.test/": new Error("Too many subrequests.") });
        expect(outcome).toMatchObject({ status: "skipped" });
    });
});

describe("runLinkCheck", () => {
    const SITEMAP = "<urlset><url><loc>https://naidenko.dev</loc></url><url><loc>https://naidenko.dev/audit/sample</loc></url></urlset>";
    const PAGES: Record<string, string> = {
        "/sitemap.xml": SITEMAP,
        "/": '<a href="https://github.com/anaidenko">GH</a><a href="https://www.brokerloop.com/">B</a><a href="https://www.linkedin.com/in/x/">in</a>',
        "/audit/sample": '<a href="https://cwe.mitre.org/data/definitions/79.html">CWE</a><a href="https://github.com/anaidenko">GH</a>'
    };
    const page = async (path: string) => {
        if (!(path in PAGES)) throw new Error(`no page ${path}`);
        return PAGES[path];
    };

    it("says nothing when every link answers", async () => {
        const { fetchImpl } = fakeFetch({});
        const alert = vi.fn(async () => true);
        const result = await runLinkCheck({ page, fetch: fetchImpl, alert, now: new Date("2026-10-11T03:17:00Z"), log: () => {} });
        expect(result).toMatchObject({ checked: 3, broken: [] });
        expect(alert).not.toHaveBeenCalled();
    });

    it("posts each broken link with the reason and the pages that carry it", async () => {
        const { fetchImpl, calls } = fakeFetch({
            "https://www.brokerloop.com/": 404,
            "https://cwe.mitre.org/data/definitions/79.html": 403
        });
        const alert = vi.fn(async (_text: string) => false);
        const log = vi.fn();
        await runLinkCheck({ page, fetch: fetchImpl, alert, now: new Date("2026-10-11T03:17:00Z"), log });
        // Slack may be out of reach: the logs keep the broken link and the unverified one too.
        expect(log).toHaveBeenCalledWith(expect.stringContaining("broken https://www.brokerloop.com/ (404)"));
        expect(log).toHaveBeenCalledWith(expect.stringContaining("unverified https://cwe.mitre.org/data/definitions/79.html (403)"));
        expect(calls).not.toContain("https://www.linkedin.com/in/x/");
        expect(alert).toHaveBeenCalledTimes(1);
        const text = alert.mock.calls[0][0];
        expect(text).toContain("https://www.brokerloop.com/ — 404, on /");
        expect(text).not.toContain("cwe.mitre.org");
    });

    it("posts that it could not run when the site's own pages fail to load", async () => {
        const alert = vi.fn(async (_text: string) => true);
        const broken = async () => {
            throw new Error("asset fetch failed");
        };
        await runLinkCheck({ page: broken, fetch: fakeFetch({}).fetchImpl, alert, now: new Date(), log: () => {} });
        expect(alert.mock.calls[0][0]).toContain("could not run: asset fetch failed");
    });
});
