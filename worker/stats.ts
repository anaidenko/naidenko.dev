export interface Row {
    label: string;
    n: number;
}

export interface StatsData {
    totals: { views: number; views30: number; views7: number; leads: number };
    months: Row[];
    days: Row[];
    pages: Row[];
    referrers: Row[];
    countries: Row[];
    devices: Row[];
    events: Row[];
}

export interface StatsDeps {
    /** Empty turns the page off. */
    password: string;
    /** Reads the counts; the arguments are the first days of the 30- and 7-day windows. */
    load(since30: string, since7: string): Promise<StatsData>;
    now(): Date;
}

const DAY_MS = 86_400_000;

function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function passwordFrom(header: string | null): string | null {
    if (!header?.startsWith("Basic ")) return null;
    try {
        const decoded = atob(header.slice("Basic ".length));
        const colon = decoded.indexOf(":");
        return colon < 0 ? null : decoded.slice(colon + 1);
    } catch {
        return null;
    }
}

/** Compares in constant time, so the answer's timing does not leak how much of a guess was right. */
function sameText(a: string, b: string): boolean {
    const x = new TextEncoder().encode(a);
    const y = new TextEncoder().encode(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    return diff === 0;
}

function table(title: string, rows: Row[]): string {
    const body = rows.length
        ? rows.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${row.n}</td></tr>`).join("")
        : `<tr><td colspan="2" class="none">Nothing yet</td></tr>`;
    return `<section><h2>${title}</h2><table>${body}</table></section>`;
}

export function renderStats(data: StatsData, now: Date): string {
    const { totals } = data;
    const tiles = [
        ["Page views, all time", totals.views],
        ["Last 30 days", totals.views30],
        ["Last 7 days", totals.views7],
        ["Messages sent", totals.leads]
    ]
        .map(([label, n]) => `<div class="tile"><b>${n}</b><span>${label}</span></div>`)
        .join("");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Stats · naidenko.dev</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; padding: 32px 16px 64px; background: #0b0c0e; color: #a1a1aa; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
main { max-width: 960px; margin: 0 auto; }
h1 { color: #f4f4f5; font-size: 22px; margin: 0 0 4px; }
h2 { color: #f4f4f5; font-size: 14px; margin: 0 0 8px; }
.note { color: #8b8b95; margin: 0 0 24px; font-size: 13px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 28px; }
.tile { border: 1px solid #8b8b9526; background: #16181c99; border-radius: 12px; padding: 14px 16px; }
.tile b { display: block; color: #f4f4f5; font-size: 26px; }
.tile span { color: #8b8b95; font-size: 13px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 4px 0; border-bottom: 1px solid #8b8b951f; }
td:last-child { text-align: right; color: #f4f4f5; font-variant-numeric: tabular-nums; }
.none { color: #8b8b95; }
</style>
</head>
<body>
<main>
<h1>naidenko.dev</h1>
<p class="note">Counted by the site's own Worker: no cookies, no IP addresses. Days are UTC. Generated ${now.toISOString().slice(0, 16).replace("T", " ")} UTC.</p>
<div class="tiles">${tiles}</div>
<div class="grid">
${table("Page views by month", data.months)}
${table("Page views, last 30 days", data.days)}
${table("Where visitors came from", data.referrers)}
${table("Countries", data.countries)}
${table("Devices", data.devices)}
${table("Pages", data.pages)}
${table("Clicks and messages", data.events)}
</div>
</main>
</body>
</html>`;
}

export async function handleStats(request: Request, deps: StatsDeps): Promise<Response> {
    if (!deps.password) return new Response("Not found", { status: 404 });
    const given = passwordFrom(request.headers.get("Authorization"));
    if (given === null || !sameText(given, deps.password)) {
        return new Response("Password required", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="naidenko.dev stats", charset="UTF-8"', "Cache-Control": "no-store" }
        });
    }
    const now = deps.now();
    const since = (days: number) => new Date(now.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
    const data = await deps.load(since(30), since(7));
    return new Response(renderStats(data, now), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
    });
}

const VIEWS = "FROM counts WHERE kind = 'view'";

/** One round trip for every table on the page. */
export async function loadStats(db: D1Database, since30: string, since7: string): Promise<StatsData> {
    const [totals, months, days, pages, referrers, countries, devices, events] = await db.batch<Row & StatsData["totals"]>([
        db
            .prepare(
                `SELECT COALESCE(SUM(CASE WHEN kind = 'view' THEN n END), 0) AS views,
                        COALESCE(SUM(CASE WHEN kind = 'view' AND day >= ?1 THEN n END), 0) AS views30,
                        COALESCE(SUM(CASE WHEN kind = 'view' AND day >= ?2 THEN n END), 0) AS views7,
                        COALESCE(SUM(CASE WHEN kind = 'event' AND name = 'generate_lead' THEN n END), 0) AS leads
                 FROM counts`
            )
            .bind(since30, since7),
        db.prepare(`SELECT substr(day, 1, 7) AS label, SUM(n) AS n ${VIEWS} GROUP BY label ORDER BY label DESC LIMIT 36`),
        db.prepare(`SELECT day AS label, SUM(n) AS n ${VIEWS} AND day >= ?1 GROUP BY day ORDER BY day DESC`).bind(since30),
        db.prepare(`SELECT name AS label, SUM(n) AS n ${VIEWS} GROUP BY name ORDER BY n DESC LIMIT 20`),
        db.prepare(`SELECT referrer AS label, SUM(n) AS n ${VIEWS} AND referrer != '' GROUP BY referrer ORDER BY n DESC LIMIT 30`),
        db.prepare(`SELECT country AS label, SUM(n) AS n ${VIEWS} AND country != '' GROUP BY country ORDER BY n DESC LIMIT 30`),
        db.prepare(`SELECT device AS label, SUM(n) AS n ${VIEWS} GROUP BY device ORDER BY n DESC`),
        db.prepare(
            `SELECT name || CASE WHEN detail != '' THEN ' · ' || detail ELSE '' END AS label, SUM(n) AS n
             FROM counts WHERE kind = 'event' GROUP BY name, detail ORDER BY n DESC LIMIT 50`
        )
    ]);
    const rows = (result: D1Result<Row & StatsData["totals"]>): Row[] => result.results.map(({ label, n }) => ({ label, n }));
    const first = totals.results[0];
    return {
        totals: { views: first.views, views30: first.views30, views7: first.views7, leads: first.leads },
        months: rows(months),
        days: rows(days),
        pages: rows(pages),
        referrers: rows(referrers),
        countries: rows(countries),
        devices: rows(devices),
        events: rows(events)
    };
}
