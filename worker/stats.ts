import { sections as pageSections } from "../src/content/sections";

import { REF } from "./hits";
import { countryName, languageName } from "./names";

export interface Row {
    label: string;
    n: number;
}

export interface Period {
    label: string;
    visitors: number;
    views: number;
}

export interface PlaceRow {
    country: string;
    region: string;
    city: string;
    n: number;
}

export interface RecentVisit {
    at: string;
    path: string;
    country: string;
    region: string;
    city: string;
    network: string;
    ref: string;
    referrer: string;
    device: string;
    browser: string;
    os: string;
    seconds: number | null;
    returned: number;
    sections: string | null;
    clicks: string | null;
}

/** The figures in the tiles, for one period. */
export interface Totals {
    visitors: number;
    views: number;
    /** Views of the home page, the only page with sections. */
    homeViews: number;
    returning: number;
    avgSeconds: number | null;
    /** Visits that reported their time and left within BOUNCE_SECONDS. */
    bounces: number;
    /** Visits that reported their time: the bounce rate's base. */
    timed: number;
    leads: number;
}

export interface StatsData {
    totals: Totals;
    /** The same figures for the period just before, or null for all time. */
    previous: Totals | null;
    days: Period[];
    months: Period[];
    pages: Row[];
    refs: Row[];
    referrers: Row[];
    countries: Row[];
    regions: PlaceRow[];
    cities: PlaceRow[];
    networks: Row[];
    devices: Row[];
    browsers: Row[];
    systems: Row[];
    languages: Row[];
    screens: Row[];
    sections: Row[];
    nav: Row[];
    durations: Row[];
    events: Row[];
    recent: RecentVisit[];
    /** Every country and tag ever seen, for the filter's menus. */
    options: { countries: string[]; refs: string[] };
}

/** Days are YYYY-MM-DD in UTC; an empty `from` means all time, an empty country or tag means all. */
export interface Filter {
    from: string;
    to: string;
    country: string;
    ref: string;
}

export interface StatsDeps {
    /** Empty turns the page off. */
    password: string;
    load(filter: Filter): Promise<StatsData>;
    now(): Date;
    /** GoatCounter's dashboard, linked for comparison; empty for no link. */
    goatcounter: string;
}

const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 7;
const PRESETS: [string, string][] = [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["7", "7 days"],
    ["30", "30 days"],
    ["90", "90 days"],
    ["365", "12 months"],
    ["all", "All time"]
];

function isDay(value: string | null): value is string {
    if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function filterOf(url: URL, now: Date): Filter {
    const params = url.searchParams;
    const today = now.toISOString().slice(0, 10);
    const daysBack = (days: number) => new Date(now.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
    const country = (params.get("country") ?? "").toUpperCase();
    const ref = (params.get("ref") ?? "").toLowerCase();
    const filter: Filter = {
        from: daysBack(DEFAULT_DAYS),
        to: today,
        country: /^([A-Z]{2}|T1)$/.test(country) ? country : "",
        ref: REF.test(ref) ? ref : ""
    };
    const from = params.get("from");
    const to = params.get("to");
    const range = params.get("range");
    // The form sends an empty `from` for all time.
    if (isDay(to) && (from === "" || isDay(from))) [filter.from, filter.to] = from <= to ? [from, to] : [to, from];
    else if (range === "all") filter.from = "";
    else if (range === "today") filter.from = today;
    else if (range === "yesterday") filter.from = filter.to = daysBack(2);
    else if (range && /^\d+$/.test(range) && PRESETS.some(([key]) => key === range)) filter.from = daysBack(Number(range));
    return filter;
}

const dayOf = (time: number) => new Date(time).toISOString().slice(0, 10);

/** The period of the same length just before the filter's, with the same country and tag. */
export function previousOf(filter: Filter): Filter | null {
    if (!filter.from) return null;
    const start = Date.parse(`${filter.from}T00:00:00Z`);
    const days = Math.round((Date.parse(`${filter.to}T00:00:00Z`) - start) / DAY_MS) + 1;
    return { ...filter, from: dayOf(start - days * DAY_MS), to: dayOf(start - DAY_MS) };
}

export interface Trend {
    arrow: "▲" | "▼" | "";
    text: string;
    tone: "good" | "bad" | "flat";
}

/**
 * How a figure moved since the previous period: in per cent, or in points for a rate (given as a
 * fraction). Green is better: growth, or a fall for a figure where lower is better.
 */
export function trend(current: number | null, previous: number | null, { rate = false, lowerIsBetter = false } = {}): Trend | null {
    if (current === null || previous === null) return null;
    const diff = current - previous;
    const direction = Math.sign(diff);
    const size = rate ? Math.round(Math.abs(diff) * 100) : previous === 0 ? null : Math.round((Math.abs(diff) / previous) * 100);
    if (direction === 0 || size === 0) return { arrow: "", text: rate ? "0 pts" : "0%", tone: "flat" };
    const sign = direction > 0 ? "+" : "−";
    return {
        arrow: direction > 0 ? "▲" : "▼",
        text: size === null ? "new" : `${sign}${size}${rate ? " pts" : "%"}`,
        tone: direction > 0 !== lowerIsBetter ? "good" : "bad"
    };
}

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

function duration(seconds: number | null): string {
    if (seconds === null) return "—";
    const whole = Math.round(seconds);
    if (whole < 60) return `${whole} s`;
    const rest = whole % 60;
    return rest ? `${Math.floor(whole / 60)} min ${rest} s` : `${whole / 60} min`;
}

const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
const placeName = ({ country, region, city }: { country: string; region: string; city: string }) =>
    [city, region, countryName(country)].filter(Boolean).join(", ");
const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The sections in the page's order, under the page's own labels; an unknown id goes last. */
function inPageOrder(rows: Row[]): Row[] {
    const index = (id: string) => {
        const found = pageSections.findIndex(section => section.id === id);
        return found < 0 ? pageSections.length : found;
    };
    return [...rows]
        .sort((a, b) => index(a.label) - index(b.label))
        .map(row => ({ ...row, label: pageSections.find(section => section.id === row.label)?.label ?? row.label }));
}

const anchorOf = (title: string) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
const heading = (title: string) => `<h2><a href="#${anchorOf(title)}">${escapeHtml(title)}</a></h2>`;

/** A table of one label and one or more figures per line; the labels are escaped here. */
function table(title: string, headers: string[], rows: [string, ...string[]][]): string {
    const head = headers.length ? `<tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr>` : "";
    const body = rows.length
        ? rows
              .map(([label, ...figures]) => `<tr><td>${escapeHtml(label)}</td>${figures.map(figure => `<td>${figure}</td>`).join("")}</tr>`)
              .join("")
        : `<tr><td colspan="${Math.max(headers.length, 2)}" class="none">Nothing yet</td></tr>`;
    return `<section id="${anchorOf(title)}">${heading(title)}<table>${head}${body}</table></section>`;
}

const counts = (rows: Row[], label: (row: Row) => string = row => row.label): [string, string][] =>
    rows.map(row => [label(row), String(row.n)]);

function recentTable(visits: RecentVisit[]): string {
    const headers = ["Time (UTC)", "Page", "Place", "Network", "Source", "Device", "On page", "Sections", "Clicks", "Visitor"];
    const rows = visits.map(visit => {
        const source = visit.ref ? `?ref=${visit.ref}` : visit.referrer || "direct";
        return [
            visit.at.slice(0, 16).replace("T", " "),
            visit.path,
            placeName(visit),
            visit.network,
            source,
            `${visit.device}, ${visit.browser}, ${visit.os}`,
            duration(visit.seconds),
            visit.sections ?? "",
            visit.clicks ?? "",
            visit.returned ? "Returning" : "New"
        ].map(cell => escapeHtml(cell));
    });
    const head = `<tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr>`;
    const body = rows.length
        ? rows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${headers.length}" class="none">Nothing yet</td></tr>`;
    return `<section id="latest-visits" class="wide">${heading("Latest visits")}<div class="scroll"><table class="recent">${head}${body}</table></div></section>`;
}

function filterForm(filter: Filter, options: StatsData["options"]): string {
    const option = (value: string, label: string, selected: string) =>
        `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
    const countries = [
        option("", "All countries", filter.country),
        ...[...options.countries]
            .sort((a, b) => countryName(a).localeCompare(countryName(b), "en"))
            .map(code => option(code, countryName(code), filter.country))
    ];
    const refs = [option("", "All link tags", filter.ref), ...options.refs.map(ref => option(ref, ref, filter.ref))];
    const presets = PRESETS.map(([range, label]) => {
        const query = new URLSearchParams({ range });
        if (filter.country) query.set("country", filter.country);
        if (filter.ref) query.set("ref", filter.ref);
        return `<a href="?${escapeHtml(query.toString())}">${label}</a>`;
    }).join(" · ");
    return `<form class="filter" method="get">
<label>From <input type="date" name="from" value="${filter.from}"></label>
<label>To <input type="date" name="to" value="${filter.to}"></label>
<label>Country <select name="country">${countries.join("")}</select></label>
<label>Link tag <select name="ref">${refs.join("")}</select></label>
<button type="submit">Apply</button>
<p class="presets">${presets}</p>
</form>`;
}

/**
 * The owner's browser is marked on the first visit here, so neither counter counts it: GoatCounter's
 * count.js skips a browser whose skipgc is "t", and so does the site's own counter. "f" keeps it
 * counted after the owner chose so.
 */
const OWNER_SCRIPT = `<script>
(() => {
    const note = document.getElementById("owner");
    const show = () => {
        let flag;
        try {
            flag = localStorage.getItem("skipgc");
        } catch {
            note.textContent = "This browser refuses storage, so it cannot be left out of the counts.";
            return;
        }
        const skipped = flag === "t";
        note.textContent = skipped ? "This browser is not counted on naidenko.dev. " : "This browser is counted on naidenko.dev. ";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = skipped ? "Count it again" : "Stop counting it";
        button.onclick = () => {
            localStorage.setItem("skipgc", skipped ? "f" : "t");
            show();
        };
        note.append(button);
    };
    try {
        if (localStorage.getItem("skipgc") === null) localStorage.setItem("skipgc", "t");
    } catch {}
    show();
})();
</script>`;

const bounceRate = (totals: Totals) => (totals.timed > 0 ? totals.bounces / totals.timed : null);

/** GoatCounter's dashboard for the same days; its own URL takes period-start and period-end. */
function goatcounterLink(dashboard: string, filter: Filter): string {
    if (!dashboard) return "";
    const url = new URL(dashboard);
    if (filter.from) {
        url.searchParams.set("period-start", filter.from);
        url.searchParams.set("period-end", filter.to);
    }
    return `<a class="quiet" href="${escapeHtml(url.toString())}" target="_blank" rel="noopener noreferrer" title="The same site in GoatCounter, whose days follow its own time zone">Compare with GoatCounter ↗</a>`;
}

export function renderStats(data: StatsData, filter: Filter, now: Date, goatcounter = ""): string {
    const { totals, previous } = data;
    const before = previousOf(filter);
    const period = before && previous ? `${before.from} to ${before.to}` : "";
    const figures: [string, string, Trend | null, string][] = [
        ["Visitors", String(totals.visitors), trend(totals.visitors, previous?.visitors ?? null), String(previous?.visitors)],
        ["Page views", String(totals.views), trend(totals.views, previous?.views ?? null), String(previous?.views)],
        ["Returning visitors", String(totals.returning), trend(totals.returning, previous?.returning ?? null), String(previous?.returning)],
        [
            "Average time on page",
            duration(totals.avgSeconds),
            trend(totals.avgSeconds, previous?.avgSeconds ?? null),
            duration(previous?.avgSeconds ?? null)
        ],
        [
            "Bounce rate",
            percent(totals.bounces, totals.timed),
            trend(bounceRate(totals), previous ? bounceRate(previous) : null, { rate: true, lowerIsBetter: true }),
            previous ? percent(previous.bounces, previous.timed) : ""
        ],
        ["Messages sent", String(totals.leads), trend(totals.leads, previous?.leads ?? null), String(previous?.leads)]
    ];
    const tiles = figures
        .map(([label, value, change, earlier]) => {
            const arrow = change?.arrow ? `<span aria-hidden="true">${change.arrow}</span> ` : "";
            const badge =
                change && period
                    ? `<small class="trend ${change.tone}" title="${escapeHtml(`${period}: ${earlier}`)}">${arrow}${change.text}</small>`
                    : "";
            return `<div class="tile"><b>${value}</b><span>${label}</span>${badge}</div>`;
        })
        .join("");
    const periods = (rows: Period[]): [string, string, string][] => rows.map(row => [row.label, String(row.visitors), String(row.views)]);
    const range = filter.from ? `${filter.from} to ${filter.to}` : `All time to ${filter.to}`;
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
main { max-width: 1100px; margin: 0 auto; }
h1 { color: #f4f4f5; font-size: 22px; margin: 0; }
h2 { color: #f4f4f5; font-size: 14px; margin: 0 0 8px; }
h2 a { color: inherit; text-decoration: none; }
h2 a:hover, h2 a:focus-visible { text-decoration: underline; }
.top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; margin-bottom: 4px; }
.quiet { color: #8b8b95; font-size: 13px; text-decoration: none; }
.quiet:hover, .quiet:focus-visible { color: #f4f4f5; text-decoration: underline; }
.note { color: #8b8b95; margin: 0 0 12px; font-size: 13px; }
button { font: inherit; font-size: 13px; color: #f4f4f5; background: #16181c; border: 1px solid #8b8b9555; border-radius: 8px; padding: 2px 10px; cursor: pointer; }
.filter { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: end; margin: 16px 0 24px; font-size: 13px; }
.filter label { display: flex; flex-direction: column; gap: 2px; }
.filter input, .filter select { font: inherit; color: #f4f4f5; background: #16181c; border: 1px solid #8b8b9555; border-radius: 8px; padding: 4px 8px; }
.presets { flex-basis: 100%; margin: 0; }
a { color: #f4f4f5; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 28px; }
.tile { border: 1px solid #8b8b9526; background: #16181c99; border-radius: 12px; padding: 14px 16px; }
.tile b { display: block; color: #f4f4f5; font-size: 26px; }
.tile span { color: #8b8b95; font-size: 13px; }
.trend { display: block; margin-top: 4px; font-size: 12px; font-variant-numeric: tabular-nums; }
.trend.good { color: #4ade80; }
.trend.bad { color: #f87171; }
.trend.flat { color: #8b8b95; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: start; gap: 16px; }
.grid > section { border: 1px solid #8b8b9526; background: #16181c66; border-radius: 12px; padding: 14px 16px; scroll-margin-top: 16px; }
.grid > section:target { border-color: #8b8b9599; }
.wide { grid-column: 1 / -1; }
.scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 500; color: #8b8b95; font-size: 12px; }
td, th { padding: 4px 8px 4px 0; border-bottom: 1px solid #8b8b951f; vertical-align: top; }
td:not(:first-child), th:not(:first-child) { text-align: right; color: #f4f4f5; font-variant-numeric: tabular-nums; }
.recent td, .recent th { text-align: left !important; font-size: 13px; }
.recent td { color: #a1a1aa; }
.none { color: #8b8b95; }
</style>
</head>
<body>
<main>
<header class="top"><h1>naidenko.dev stats</h1>${goatcounterLink(goatcounter, filter)}</header>
<p class="note">Counted by the site's own Worker: no cookies, no IP addresses. Days and times are UTC. A visitor is one network and browser on one day, so people behind one office address count as one, and a phone that changes networks as several. Generated ${now.toISOString().slice(0, 16).replace("T", " ")} UTC.</p>
<p class="note" id="owner"></p>
${filterForm(filter, data.options)}
<p class="note">Showing ${escapeHtml(range)}${filter.country ? `, ${escapeHtml(countryName(filter.country))}` : ""}${filter.ref ? `, ?ref=${escapeHtml(filter.ref)}` : ""}.</p>
<div class="tiles">${tiles}</div>
<p class="note">${period ? `Arrows compare with ${escapeHtml(period)}. ` : ""}A bounce is a visit that left within ${BOUNCE_SECONDS} s. The bounce rate and the average time count only visits that reported their time; a phone can close a page before it does.</p>
<div class="grid">
${table("By day", ["Day", "Visitors", "Views"], periods(data.days))}
${table("By month", ["Month", "Visitors", "Views"], periods(data.months))}
${table("Pages", [], counts(data.pages))}
${table("Link tags (?ref=)", [], counts(data.refs))}
${table("Referring sites", [], counts(data.referrers))}
${table(
    "Countries",
    [],
    counts(data.countries, row => countryName(row.label))
)}
${table(
    "Regions",
    [],
    data.regions.map(row => [placeName(row), String(row.n)])
)}
${table(
    "Cities",
    [],
    data.cities.map(row => [placeName(row), String(row.n)])
)}
${table("Networks", [], counts(data.networks))}
${table(
    "Devices",
    [],
    counts(data.devices, row => capitalized(row.label))
)}
${table("Browsers", [], counts(data.browsers))}
${table("Systems", [], counts(data.systems))}
${table(
    "Languages",
    [],
    counts(data.languages, row => languageName(row.label))
)}
${table("Screen widths", [], counts(data.screens))}
${table(
    "Sections reached",
    [],
    inPageOrder(data.sections).map(row => [row.label, `${row.n} · ${percent(row.n, totals.homeViews)}`])
)}
${table("Menu clicks", [], counts(inPageOrder(data.nav)))}
${table("Time on page", [], counts(data.durations))}
${table("Clicks and messages", [], counts(data.events))}
${recentTable(data.recent)}
</div>
</main>
${OWNER_SCRIPT}
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
    const filter = filterOf(new URL(request.url), now);
    const data = await deps.load(filter);
    return new Response(renderStats(data, filter, now, deps.goatcounter), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
    });
}

/** The visits the filter selects, as `f`, for every query below; ?1 to ?4 are the filter. */
const FILTERED = `WITH f AS (SELECT * FROM visits WHERE day >= ?1 AND day <= ?2 AND (?3 = '' OR country = ?3) AND (?4 = '' OR ref = ?4))`;
/**
 * People: one per visitor per day, counted within the filter. A visit without a hash (erased after
 * 13 months, or never keyed) falls back to `first_today`, which was fixed when it was stored.
 */
const PEOPLE = `(COUNT(DISTINCT CASE WHEN visitor IS NOT NULL THEN day || '|' || visitor END)
    + COALESCE(SUM(CASE WHEN visitor IS NULL THEN first_today END), 0))`;
const RETURNING = `(COUNT(DISTINCT CASE WHEN visitor IS NOT NULL AND returned = 1 THEN day || '|' || visitor END)
    + COALESCE(SUM(CASE WHEN visitor IS NULL THEN first_today * returned END), 0))`;
/** A visit that left within this many seconds is a bounce (Andrii, 2026-09-30). */
const BOUNCE_SECONDS = 10;
const TOTALS = `SELECT COUNT(*) AS views, COALESCE(SUM(path = '/'), 0) AS homeViews, ${PEOPLE} AS visitors, ${RETURNING} AS returners,
        AVG(seconds) AS avgSeconds, COALESCE(SUM(seconds < ${BOUNCE_SECONDS}), 0) AS bounces, COUNT(seconds) AS timed,
        (SELECT COUNT(*) FROM events e WHERE e.name = 'generate_lead' AND e.visit IN (SELECT id FROM f)) AS leads
    FROM f`;

function totalsOf(result: D1Result<Record<string, unknown>>): Totals {
    const { returners, ...rest } = result.results[0] as Omit<Totals, "returning"> & { returners: number };
    return { ...rest, returning: returners };
}
const EVENT_LABEL = `e.name || CASE WHEN e.detail != '' THEN ' · ' || e.detail ELSE '' END`;

/** One round trip for every table on the page. */
export async function loadStats(db: D1Database, filter: Filter): Promise<StatsData> {
    const select = (range: Filter, sql: string) => db.prepare(`${FILTERED} ${sql}`).bind(range.from, range.to, range.country, range.ref);
    const filtered = (sql: string) => select(filter, sql);
    const before = previousOf(filter);
    const breakdown = (column: string, limit: number) =>
        filtered(
            `SELECT ${column} AS label, ${PEOPLE} AS n FROM f WHERE ${column} != '' GROUP BY ${column} ORDER BY n DESC, label LIMIT ${limit}`
        );
    const results = await db.batch<Record<string, unknown>>([
        filtered(TOTALS),
        filtered(`SELECT day AS label, ${PEOPLE} AS visitors, COUNT(*) AS views FROM f GROUP BY day ORDER BY day DESC LIMIT 366`),
        filtered(
            `SELECT substr(day, 1, 7) AS label, ${PEOPLE} AS visitors, COUNT(*) AS views FROM f GROUP BY label ORDER BY label DESC LIMIT 120`
        ),
        breakdown("path", 20),
        breakdown("ref", 30),
        breakdown("referrer", 30),
        filtered(`SELECT country AS label, ${PEOPLE} AS n FROM f GROUP BY country ORDER BY n DESC, label LIMIT 60`),
        filtered(
            `SELECT country, region, '' AS city, ${PEOPLE} AS n FROM f WHERE region != '' GROUP BY country, region ORDER BY n DESC LIMIT 30`
        ),
        filtered(
            `SELECT country, region, city, ${PEOPLE} AS n FROM f WHERE city != '' GROUP BY country, region, city ORDER BY n DESC LIMIT 50`
        ),
        breakdown("network", 30),
        breakdown("device", 10),
        breakdown("browser", 20),
        breakdown("os", 20),
        breakdown("language", 30),
        filtered(
            `SELECT CASE WHEN screen IS NULL THEN 'Unknown' WHEN screen < 600 THEN 'Under 600 px (phones)'
                WHEN screen < 1024 THEN '600–1023 px (tablets)' WHEN screen < 1920 THEN '1024–1919 px (laptops)'
                ELSE '1920 px and wider' END AS label, ${PEOPLE} AS n
             FROM f GROUP BY label ORDER BY MIN(COALESCE(screen, 1000000))`
        ),
        filtered(
            `SELECT e.detail AS label, COUNT(DISTINCT e.visit) AS n FROM events e JOIN f ON e.visit = f.id
             WHERE e.name = 'section_view' GROUP BY e.detail ORDER BY n DESC`
        ),
        filtered(
            `SELECT e.detail AS label, COUNT(*) AS n FROM events e JOIN f ON e.visit = f.id
             WHERE e.name = 'nav_click' GROUP BY e.detail ORDER BY n DESC`
        ),
        filtered(
            `SELECT CASE WHEN seconds IS NULL THEN 'Unknown' WHEN seconds < 10 THEN 'Under 10 s' WHEN seconds < 30 THEN '10–29 s'
                WHEN seconds < 60 THEN '30–59 s' WHEN seconds < 180 THEN '1–3 min' WHEN seconds < 600 THEN '3–10 min'
                ELSE '10 min or more' END AS label, COUNT(*) AS n
             FROM f GROUP BY label ORDER BY MIN(COALESCE(seconds, 1000000))`
        ),
        filtered(
            `SELECT ${EVENT_LABEL} AS label, COUNT(*) AS n FROM events e JOIN f ON e.visit = f.id
             WHERE e.name NOT IN ('section_view', 'nav_click') GROUP BY e.name, e.detail ORDER BY n DESC LIMIT 50`
        ),
        filtered(
            `SELECT f.at, f.path, f.country, f.region, f.city, f.network, f.ref, f.referrer, f.device, f.browser, f.os, f.seconds, f.returned,
                (SELECT group_concat(e.detail, ', ') FROM events e WHERE e.visit = f.id AND e.name = 'section_view') AS sections,
                (SELECT group_concat(${EVENT_LABEL}, ', ') FROM events e WHERE e.visit = f.id AND e.name != 'section_view') AS clicks
             FROM f ORDER BY f.at DESC LIMIT 50`
        ),
        db.prepare(`SELECT DISTINCT country AS label FROM visits WHERE country != '' ORDER BY country`),
        db.prepare(`SELECT DISTINCT ref AS label FROM visits WHERE ref != '' ORDER BY ref`),
        ...(before ? [select(before, TOTALS)] : [])
    ]);
    const [totals, days, months, pages, refs, referrers, countries, regions, cities, networks, devices, browsers, systems, languages] =
        results;
    const [screens, sections, nav, durations, events, recent, countryOptions, refOptions, previous] = results.slice(14);
    const rows = <T>(result: D1Result<Record<string, unknown>>) => result.results as T[];
    return {
        totals: totalsOf(totals),
        previous: previous ? totalsOf(previous) : null,
        days: rows<Period>(days),
        months: rows<Period>(months),
        pages: rows<Row>(pages),
        refs: rows<Row>(refs),
        referrers: rows<Row>(referrers),
        countries: rows<Row>(countries),
        regions: rows<PlaceRow>(regions),
        cities: rows<PlaceRow>(cities),
        networks: rows<Row>(networks),
        devices: rows<Row>(devices),
        browsers: rows<Row>(browsers),
        systems: rows<Row>(systems),
        languages: rows<Row>(languages),
        screens: rows<Row>(screens),
        sections: rows<Row>(sections),
        nav: rows<Row>(nav),
        durations: rows<Row>(durations),
        events: rows<Row>(events),
        recent: rows<RecentVisit>(recent),
        options: {
            countries: rows<Row>(countryOptions).map(row => row.label),
            refs: rows<Row>(refOptions).map(row => row.label)
        }
    };
}
