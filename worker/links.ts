import { escapeSlack } from "./alert";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Hosts the check leaves alone. LinkedIn answers 999 to any script, for a missing profile as for a
 * real one (measured 2026-10-10). Toptal's terms bar access by any means but its own interface
 * (TPAA §5(b)). The site's own links are checked in the build (scripts/check-links.mjs).
 */
const UNCHECKED_HOSTS = ["linkedin.com", "toptal.com", "naidenko.dev"];

/**
 * Requests per run for the outside links, redirects included. Workers Free allows 50 subrequests
 * per invocation; the rest go to the sitemap, the pages, the retention query and Slack.
 */
const BUDGET = 40;
/** The home page's links are checked every day; the others, the sample report's references, take turns. */
const TURN = 15;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const USER_AGENT = "naidenko.dev link check (+https://naidenko.dev)";

export type Outcome = { url: string; status: "ok" | "broken" | "unverified" | "skipped"; reason: string };

export function isUnchecked(url: string): boolean {
    const host = new URL(url).hostname;
    return UNCHECKED_HOSTS.some(unchecked => host === unchecked || host.endsWith(`.${unchecked}`));
}

/** The page's links to other sites, each once. */
export function linksIn(html: string): string[] {
    const links = [...html.matchAll(/<a\b[^>]*?\shref="(https?:\/\/[^"]+)"/g)].map(match => match[1].replace(/&amp;/g, "&"));
    return [...new Set(links)];
}

/** The sitemap's pages, as paths on the site. */
export function pagesIn(sitemap: string): string[] {
    return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
}

/** The links for a day: every daily one, then the day's turn of the rotating ones. */
export function linksForDay(daily: string[], rotating: string[], day: number, turn: number): string[] {
    const count = Math.min(turn, rotating.length);
    const start = rotating.length ? (day * turn) % rotating.length : 0;
    return [...daily, ...Array.from({ length: count }, (_, i) => rotating[(start + i) % rotating.length])];
}

/** One look at a link, following its redirects by hand so that each hop is counted against the budget. */
async function look(url: string, fetchImpl: FetchLike, budget: { left: number }): Promise<Outcome> {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        if (budget.left <= 0) return { url, status: "skipped", reason: "out of requests for today" };
        budget.left -= 1;
        let response: Response;
        try {
            response = await fetchImpl(current, {
                redirect: "manual",
                headers: { "User-Agent": USER_AGENT },
                signal: AbortSignal.timeout(TIMEOUT_MS)
            });
        } catch (error) {
            const name = error instanceof Error ? error.name : "";
            const message = error instanceof Error ? error.message : String(error);
            if (/subrequest/i.test(message)) return { url, status: "skipped", reason: "out of requests for today" };
            if (name === "TimeoutError" || name === "AbortError") return { url, status: "broken", reason: "timeout" };
            return { url, status: "broken", reason: `network error: ${message}` };
        }
        await response.body?.cancel();
        const location = response.headers.get("Location");
        if (response.status >= 300 && response.status < 400 && location) {
            current = new URL(location, current).href;
            continue;
        }
        if (response.ok) return { url, status: "ok", reason: String(response.status) };
        if (response.status === 404 || response.status === 410) return { url, status: "broken", reason: String(response.status) };
        // A bot wall answers 403, 429 or 503, and LinkedIn 999; none of them says the page is gone.
        return { url, status: "unverified", reason: String(response.status) };
    }
    return { url, status: "broken", reason: "too many redirects" };
}

/** A link is broken when it is still broken on a second look: a site can fail for a moment. */
export async function checkLink(url: string, fetchImpl: FetchLike, budget: { left: number }): Promise<Outcome> {
    const first = await look(url, fetchImpl, budget);
    return first.status === "broken" ? look(url, fetchImpl, budget) : first;
}

export interface LinkCheckDeps {
    /** A page or file of the site, by path. */
    page(path: string): Promise<string>;
    fetch: FetchLike;
    /** Posts to Slack. */
    alert(text: string): Promise<boolean>;
    now: Date;
    log(message: string): void;
}

/**
 * The daily check of the site's outside links: the sitemap's pages are read from the deployed
 * build, and a broken link is posted to Slack with the pages that carry it. It never throws: a run
 * that cannot read the site posts that instead.
 */
export async function runLinkCheck(deps: LinkCheckDeps): Promise<{ checked: number; broken: Outcome[] }> {
    try {
        const paths = pagesIn(await deps.page("/sitemap.xml"));
        if (!paths.length) throw new Error("the sitemap lists no page");
        const where = new Map<string, string[]>();
        const daily: string[] = [];
        for (const [i, path] of paths.entries()) {
            for (const url of linksIn(await deps.page(path))) {
                if (isUnchecked(url)) continue;
                if (i === 0 && !where.has(url)) daily.push(url);
                where.set(url, [...(where.get(url) ?? []), path]);
            }
        }
        const rotating = [...where.keys()].filter(url => !daily.includes(url)).sort();
        const day = Math.floor(deps.now.getTime() / 86_400_000);
        const budget = { left: BUDGET };
        const outcomes: Outcome[] = [];
        for (const url of linksForDay(daily, rotating, day, TURN)) outcomes.push(await checkLink(url, deps.fetch, budget));
        const broken = outcomes.filter(outcome => outcome.status === "broken");
        const count = (status: Outcome["status"]) => outcomes.filter(outcome => outcome.status === status).length;
        const unverified = outcomes.filter(outcome => outcome.status === "unverified");
        deps.log(
            `link check: ${count("ok")} ok, ${broken.length} broken, ${unverified.length} unverified, ${count("skipped")} skipped, of ${where.size}` +
                [...broken, ...unverified].map(outcome => ` | ${outcome.status} ${outcome.url} (${outcome.reason})`).join("")
        );
        if (broken.length) {
            const lines = broken.map(
                outcome => `• ${escapeSlack(outcome.url)} — ${escapeSlack(outcome.reason)}, on ${(where.get(outcome.url) ?? []).join(", ")}`
            );
            await deps.alert([`Broken links on naidenko.dev (the daily check):`, ...lines].join("\n"));
        }
        return { checked: outcomes.length - count("skipped"), broken };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        deps.log(`link check could not run: ${message}`);
        await deps.alert(`The daily link check on naidenko.dev could not run: ${escapeSlack(message)}`);
        return { checked: 0, broken: [] };
    }
}
