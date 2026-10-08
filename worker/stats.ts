import { samplePage } from "../src/content/audit";
import { menu, sections as pageSections } from "../src/content/sections";

import { REF } from "./hits";
import { countryName, languageName } from "./names";
import { networkKey } from "./visitor";

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
    /** Views of the home page: its sections' reach is measured against them. */
    homeViews: number;
    /** Views of the sample report: how far it was read is measured against them. */
    sampleViews: number;
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
    /** The home page's sections reached. */
    sections: Row[];
    /** The sample report's sections reached. */
    sampleSections: Row[];
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
    /** True while the key is under its limit. */
    rateLimit(key: string): Promise<boolean>;
    load(filter: Filter): Promise<StatsData>;
    now(): Date;
    /** GoatCounter's dashboard, linked for comparison; empty for no link. */
    goatcounter: string;
}

const DAY_MS = 86_400_000;
const DEFAULT_DAYS = 30;
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

/** A tag to filter by, or a stem and "*" for every tag that starts with it: "toptal*" is every Toptal link. */
function refFilterOf(ref: string): string {
    const stem = ref.endsWith("*") ? ref.slice(0, -1) : ref;
    return REF.test(stem) && (stem || !ref) ? ref : "";
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
        ref: refFilterOf(ref)
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
        // atob gives one character per byte; the browser sent UTF-8, as the challenge's charset asks.
        const bytes = Uint8Array.from(atob(header.slice("Basic ".length)), c => c.charCodeAt(0));
        const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
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

type Sections = readonly { id: string; label: string }[];

/** Each page with sections that /stats follows, by path. */
const SECTIONS_OF: Record<string, Sections> = { "/": pageSections, [samplePage.path]: samplePage.sections };

/** Both builds' menu entries in the menu's order: naidenko.dev's, then the Toptal build's "Hire". */
const MENU: Sections = [...menu(false), ...menu(true).filter(entry => !menu(false).some(own => own.id === entry.id))];

/**
 * The home page's dots: a visit saw one build, whose last section is "contact" on naidenko.dev and
 * "hire" on the Toptal build, so both light the last dot.
 */
const HOME_DOTS: Sections = pageSections.filter(section => section.id !== "hire");
const DOT_OF: Record<string, string> = { hire: "contact" };

/** The sections in the page's order, under the page's own labels; an unknown id goes last. */
function inPageOrder(rows: Row[], order: Sections = pageSections): Row[] {
    const index = (id: string) => {
        const found = order.findIndex(section => section.id === id);
        return found < 0 ? order.length : found;
    };
    return [...rows]
        .sort((a, b) => index(a.label) - index(b.label))
        .map(row => ({ ...row, label: order.find(section => section.id === row.label)?.label ?? row.label }));
}

const anchorOf = (title: string) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

/** A boxed table or chart under a heading that links to itself. */
function card(title: string, body: string, wide = false): string {
    const id = anchorOf(title);
    return `<section id="${id}" class="card${wide ? " wide" : ""}"><h3><a href="#${id}">${escapeHtml(title)}</a></h3>${body}</section>`;
}

function group(id: string, title: string, body: string): string {
    return `<section id="${id}" class="group"><h2><a href="#${id}">${title}</a></h2>${body}</section>`;
}

const GROUPS: [string, string][] = [
    ["traffic", "Traffic"],
    ["sources", "Sources"],
    ["audience", "Audience"],
    ["technology", "Technology"],
    ["engagement", "Engagement"],
    ["latest-visits", "Latest visits"]
];

const nothing = (columns: number) => `<tr><td colspan="${columns}" class="none">Nothing yet</td></tr>`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Rows of a label and a figure, each with a bar for its share of `whole`, or of the largest row.
 * The labels are escaped here; the figures are numbers the page formats.
 */
function barTable(rows: { label: string; value: string; n: number }[], whole?: number): string {
    const max = whole ?? Math.max(0, ...rows.map(row => row.n));
    const body = rows.length
        ? rows
              .map(row => {
                  const width = max > 0 ? Math.min(100, Math.round((row.n / max) * 100)) : 0;
                  return `<tr><td>${escapeHtml(row.label)}<span class="bar" style="width: ${width}%"></span></td><td>${row.value}</td></tr>`;
              })
              .join("")
        : nothing(2);
    return `<table class="bars">${body}</table>`;
}

const counted = (rows: Row[], label: (row: Row) => string = row => row.label) =>
    barTable(rows.map(row => ({ label: label(row), value: String(row.n), n: row.n })));

function periodTable(rows: Period[], first: string): string {
    const head = `<tr><th>${first}</th><th>Visitors</th><th>Views</th></tr>`;
    const body = rows.length
        ? rows.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${row.visitors}</td><td>${row.views}</td></tr>`).join("")
        : nothing(3);
    return `<table>${head}${body}</table>`;
}

/** The top of a chart's scale: 1, 2, 2.5 or 5 times a power of ten, at least the value. */
export function niceCeiling(value: number): number {
    if (value <= 1) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 2.5, 5, 10].map(step => step * magnitude).find(nice => nice >= value) ?? 10 * magnitude;
}

/**
 * The chart's points, oldest first, with zeros where nothing was counted: every day of the range,
 * or every month once the range is longer than a year. All time starts at the first visit.
 */
export function chartSeries(days: Period[], months: Period[], filter: Filter): Period[] {
    const firstDay = days.map(day => day.label).sort()[0];
    const firstMonth = months.map(month => month.label).sort()[0];
    const from = filter.from || (firstMonth && (!firstDay || firstMonth < firstDay.slice(0, 7)) ? `${firstMonth}-01` : firstDay);
    if (!from) return [];
    const start = Date.parse(`${from}T00:00:00Z`);
    const span = Math.round((Date.parse(`${filter.to}T00:00:00Z`) - start) / DAY_MS) + 1;
    if (span <= 366) {
        const byDay = new Map(days.map(day => [day.label, day]));
        return Array.from({ length: span }, (_, index) => {
            const label = dayOf(start + index * DAY_MS);
            return byDay.get(label) ?? { label, visitors: 0, views: 0 };
        });
    }
    const byMonth = new Map(months.map(month => [month.label, month]));
    const series: Period[] = [];
    for (let date = new Date(start); date.toISOString().slice(0, 7) <= filter.to.slice(0, 7);) {
        const label = date.toISOString().slice(0, 7);
        series.push(byMonth.get(label) ?? { label, visitors: 0, views: 0 });
        date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    }
    return series;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Sep 24" for a day, "Sep 2026" for a month. */
const shortDate = (label: string) =>
    label.length === 7
        ? `${MONTHS[Number(label.slice(5, 7)) - 1]} ${label.slice(0, 4)}`
        : `${MONTHS[Number(label.slice(5, 7)) - 1]} ${Number(label.slice(8, 10))}`;

/**
 * Visitors per day (or month) as columns on one scale. Each column shows its numbers on hover and
 * on focus; the same numbers are in the table below the chart, so nothing depends on hovering.
 */
function chart(series: Period[], filter: Filter): string {
    if (series.length === 0) return `<p class="none">Nothing yet</p>`;
    const monthly = series[0].label.length === 7;
    const total = series.reduce((sum, point) => sum + point.visitors, 0);
    const peak = series.reduce((best, point) => (point.visitors > best.visitors ? point : best), series[0]);
    const top = niceCeiling(peak.visitors);
    const ticks = [top, top / 2, 0].filter(tick => Number.isInteger(tick));
    const range = filter.from ? `${filter.from} to ${filter.to}` : `all time to ${filter.to}`;
    const most = peak.visitors ? `, most ${monthly ? "in" : "on"} ${peak.label} (${peak.visitors})` : "";
    const label = `Visitors per ${monthly ? "month" : "day"}, ${range}: ${total} in total${most}`;
    // Labels are counted back from the latest column, so the newest date is always named.
    const every = Math.ceil(series.length / 8);
    const last = series.length - 1;
    const columns = series
        .map(point => {
            const height = point.visitors ? Math.max(1, Math.round((point.visitors / top) * 100)) : 0;
            const figures = `<b>${point.visitors}</b> ${point.visitors === 1 ? "visitor" : "visitors"} · ${plural(point.views, "view")}`;
            // The tip sits on top of its own column, whatever its height.
            const tip = `<span class="tip" style="bottom: ${height}%">${figures}<br>${escapeHtml(point.label)}</span>`;
            return `<div class="col"${series.length <= 31 ? ' tabindex="0"' : ""}><i style="height: ${height}%"></i>${tip}</div>`;
        })
        .join("");
    // Every other label hides on a phone, where the columns are too narrow for all of them.
    const dates = series
        .map((point, index) => {
            const step = (last - index) / every;
            if (!Number.isInteger(step)) return "<span></span>";
            return `<span${step % 2 ? ' class="minor"' : ""}>${escapeHtml(shortDate(point.label))}</span>`;
        })
        .join("");
    return `<figure class="chart" aria-label="${escapeHtml(label)}" style="--n: ${series.length}">
<div class="plot"><div class="ticks">${ticks.map(tick => `<span style="bottom: ${(tick / top) * 100}%">${tick}</span>`).join("")}</div><div class="cols">${columns}</div></div>
<div class="dates">${dates}</div>
</figure>`;
}

/** The sections a visit reached, as one dot per section in the page's order. */
function sectionDots(visit: RecentVisit): string {
    const order = SECTIONS_OF[visit.path];
    if (!order) return `<span class="muted">${escapeHtml(visit.sections || "—")}</span>`;
    const reached = new Set((visit.sections ?? "").split(", ").filter(Boolean));
    const names = order.filter(section => reached.has(section.id)).map(section => section.label);
    const lit = new Set([...reached].map(id => DOT_OF[id] ?? id));
    const dots = (visit.path === "/" ? HOME_DOTS : order).map(section => (lit.has(section.id) ? `<i class="on"></i>` : "<i></i>")).join("");
    return `<span class="dots" title="${escapeHtml(names.join(", ") || "No section reached")}">${dots}</span>`;
}

const SHOWN_VISITS = 20;

function visitRow(visit: RecentVisit): string {
    const at = `<time title="${visit.at.slice(0, 19).replace("T", " ")} UTC">${MONTHS[Number(visit.at.slice(5, 7)) - 1]} ${Number(visit.at.slice(8, 10))}, ${visit.at.slice(11, 16)}</time>`;
    const place = [visit.city, countryName(visit.country)].filter(Boolean).join(", ");
    const source = visit.ref ? `?ref=${visit.ref}` : visit.referrer || "direct";
    const device = `${visit.browser} · ${visit.os}${visit.device === "desktop" ? "" : ` · ${visit.device}`}`;
    const clicks = (visit.clicks ?? "")
        .split(", ")
        .filter(Boolean)
        .map(click => `<span class="chip">${escapeHtml(click)}</span>`)
        .join("");
    const cells = [
        at,
        visit.returned ? `<span class="tag">Returning</span>` : `<span class="muted">New</span>`,
        escapeHtml(visit.path),
        `<span class="clip place" title="${escapeHtml(placeName(visit))}">${escapeHtml(place)}</span>`,
        `<span class="clip" title="${escapeHtml(visit.network)}">${escapeHtml(visit.network)}</span>`,
        escapeHtml(source),
        escapeHtml(device),
        duration(visit.seconds),
        sectionDots(visit),
        `<div class="chips">${clicks}</div>`
    ];
    return `<tr>${cells.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
}

/** The latest visits, one line each; the first 20 show, the rest on request. */
function recentVisits(visits: RecentVisit[]): string {
    const headers = ["When (UTC)", "Visitor", "Page", "Place", "Network", "Source", "Device", "On page", "Sections", "Clicks"];
    const head = `<thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead>`;
    const shown = visits.slice(0, SHOWN_VISITS).map(visitRow).join("") || nothing(headers.length);
    const rest = visits.slice(SHOWN_VISITS);
    const more = rest.length ? `<tbody id="more-visits" hidden>${rest.map(visitRow).join("")}</tbody>` : "";
    const button = rest.length
        ? `<button type="button" id="show-visits">Show all ${visits.length}</button>
<script>
document.getElementById("show-visits").addEventListener("click", event => {
    document.getElementById("more-visits").hidden = false;
    event.currentTarget.remove();
});
</script>`
        : "";
    return `<div class="scroll"><table class="recent">${head}<tbody id="visits">${shown}</tbody>${more}</table></div>${button}`;
}

/** The preset a filter matches ("7", "today", "all"...), or "" for a custom range. */
export function activePreset(filter: Filter, now: Date): string {
    const matches = ([range]: [string, string]) => {
        const preset = filterOf(new URL(`https://naidenko.dev/stats?range=${range}`), now);
        return preset.from === filter.from && preset.to === filter.to;
    };
    return PRESETS.find(matches)?.[0] ?? "";
}

function filterForm(filter: Filter, options: StatsData["options"], now: Date): string {
    const option = (value: string, label: string, selected: string) =>
        `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
    const countries = [
        option("", "All countries", filter.country),
        ...[...options.countries]
            .sort((a, b) => countryName(a).localeCompare(countryName(b), "en"))
            .map(code => option(code, countryName(code), filter.country))
    ];
    // Every visit through Toptal at once: the Toptal host's toptal-<job id> tags and the profile's toptal.
    const toptal = options.refs.some(ref => ref.startsWith("toptal")) ? [option("toptal*", "Every Toptal link (toptal*)", filter.ref)] : [];
    const refs = [option("", "All link tags", filter.ref), ...toptal, ...options.refs.map(ref => option(ref, ref, filter.ref))];
    const current = activePreset(filter, now);
    const presets = PRESETS.map(([range, label]) => {
        const query = new URLSearchParams({ range });
        if (filter.country) query.set("country", filter.country);
        if (filter.ref) query.set("ref", filter.ref);
        return `<a class="pill" href="?${escapeHtml(query.toString())}"${range === current ? ' aria-current="page"' : ""}>${label}</a>`;
    }).join("");
    return `<form class="filter" method="get">
<div class="presets" role="group" aria-label="Period">${presets}</div>
<div class="fields">
<label>From <input type="date" name="from" value="${filter.from}"></label>
<label>To <input type="date" name="to" value="${filter.to}"></label>
<label>Country <select name="country">${countries.join("")}</select></label>
<label>Link tag <select name="ref">${refs.join("")}</select></label>
<button type="submit">Apply</button>
</div>
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
        note.textContent = skipped
            ? "This browser is not counted on naidenko.dev. "
            : "This browser is counted on naidenko.dev, even from an ignored network. ";
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
    const range = filter.from ? `${filter.from} to ${filter.to}` : `All time to ${filter.to}`;
    const series = chartSeries(data.days, data.months, filter);
    const unit = series[0]?.label.length === 7 ? "month" : "day";
    const reach = inPageOrder(data.sections).map(row => ({
        label: row.label,
        value: `${row.n} · ${percent(row.n, totals.homeViews)}`,
        n: row.n
    }));
    const read = inPageOrder(data.sampleSections, samplePage.sections).map(row => ({
        label: row.label,
        value: `${row.n} · ${percent(row.n, totals.sampleViews)}`,
        n: row.n
    }));
    const traffic = [
        card(
            `Visitors per ${unit}`,
            `${chart(series, filter)}<details><summary>Show the numbers</summary>${periodTable(data.days, "Day")}</details>`,
            true
        ),
        card("By month", periodTable(data.months, "Month")),
        card("Pages", counted(data.pages))
    ];
    const sources = [card("Link tags (?ref=)", counted(data.refs)), card("Referring sites", counted(data.referrers))];
    const audience = [
        card(
            "Countries",
            counted(data.countries, row => countryName(row.label))
        ),
        card("Regions", barTable(data.regions.map(row => ({ label: placeName(row), value: String(row.n), n: row.n })))),
        card("Cities", barTable(data.cities.map(row => ({ label: placeName(row), value: String(row.n), n: row.n })))),
        card("Networks", counted(data.networks))
    ];
    const technology = [
        card(
            "Devices",
            counted(data.devices, row => capitalized(row.label))
        ),
        card("Browsers", counted(data.browsers)),
        card("Systems", counted(data.systems)),
        card(
            "Languages",
            counted(data.languages, row => languageName(row.label))
        ),
        card("Screen widths", counted(data.screens))
    ];
    const engagement = [
        card("Sections reached", barTable(reach, totals.homeViews)),
        card("Sample report read", barTable(read, totals.sampleViews)),
        card("Menu clicks", counted(inPageOrder(data.nav, MENU))),
        card("Time on page", counted(data.durations)),
        card("Clicks and messages", counted(data.events))
    ];
    const grid = (cards: string[]) => `<div class="grid">${cards.join("")}</div>`;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Stats · naidenko.dev</title>
<style>
:root {
    color-scheme: dark;
    --canvas: #0b0c0e;
    --card: #121317;
    --raised: #1b1d22;
    --ring: #8b8b9526;
    --line: #8b8b951f;
    --ink: #a1a1aa;
    --strong: #f4f4f5;
    --muted: #8b8b95;
    --series: #3987e5;
    --series-hover: #6aa6ee;
    --good: #4ade80;
    --bad: #f87171;
}
* { box-sizing: border-box; }
body { margin: 0; padding: 32px 16px 64px; background: var(--canvas); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
main { max-width: 1280px; margin: 0 auto; }
a { color: var(--strong); }
h1 { color: var(--strong); font-size: 22px; margin: 0; }
h2 { color: var(--strong); font-size: 16px; margin: 0 0 12px; }
h3 { color: var(--strong); font-size: 14px; margin: 0 0 10px; }
h2 a, h3 a { color: inherit; text-decoration: none; }
h2 a:hover, h2 a:focus-visible, h3 a:hover, h3 a:focus-visible { text-decoration: underline; }
.top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; margin-bottom: 4px; }
.quiet { color: var(--muted); font-size: 13px; text-decoration: none; }
.quiet:hover, .quiet:focus-visible { color: var(--strong); text-decoration: underline; }
.note { color: var(--muted); margin: 0 0 12px; font-size: 13px; }
.muted, .none { color: var(--muted); }
button { font: inherit; font-size: 13px; color: var(--strong); background: var(--raised); border: 1px solid #8b8b9555; border-radius: 8px; padding: 3px 12px; cursor: pointer; }
button:hover, button:focus-visible { border-color: #8b8b9599; }
.filter { display: grid; gap: 12px; margin: 20px 0 20px; font-size: 13px; }
.presets { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { padding: 3px 12px; border: 1px solid #8b8b9540; border-radius: 999px; color: var(--ink); text-decoration: none; }
.pill:hover, .pill:focus-visible { color: var(--strong); border-color: #8b8b9599; }
.pill[aria-current="page"] { color: var(--canvas); background: var(--strong); border-color: var(--strong); font-weight: 600; }
.fields { display: flex; flex-wrap: wrap; align-items: end; gap: 8px 12px; }
.fields label { display: flex; flex-direction: column; gap: 2px; color: var(--muted); }
.fields input, .fields select { font: inherit; color: var(--strong); background: var(--raised); border: 1px solid #8b8b9555; border-radius: 8px; padding: 4px 8px; }
.jump { position: sticky; top: 0; z-index: 10; display: flex; gap: 4px 20px; overflow-x: auto; white-space: nowrap; margin: 24px 0 0; padding: 10px 0; background: #0b0c0ee6; backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); font-size: 13px; }
.jump a { color: var(--muted); text-decoration: none; }
.jump a:hover, .jump a:focus-visible { color: var(--strong); }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px; }
.tile { border: 1px solid var(--ring); background: var(--card); border-radius: 12px; padding: 14px 16px; }
.tile b { display: block; color: var(--strong); font-size: 26px; font-weight: 600; }
.tile > span { display: block; color: var(--muted); font-size: 13px; }
.trend { display: inline-block; margin-top: 8px; padding: 0 8px; border-radius: 999px; font-size: 12px; line-height: 20px; font-variant-numeric: tabular-nums; }
.trend.good { color: var(--good); background: #4ade801a; }
.trend.bad { color: var(--bad); background: #f871711a; }
.trend.flat { color: var(--muted); background: #8b8b951a; }
.group { padding-top: 28px; scroll-margin-top: 40px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); align-items: start; gap: 16px; }
.card { min-width: 0; border: 1px solid var(--ring); background: var(--card); border-radius: 12px; padding: 14px 16px; scroll-margin-top: 56px; }
.card:target { border-color: #8b8b9599; }
.wide { grid-column: 1 / -1; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 500; color: var(--muted); font-size: 12px; }
td, th { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
td:not(:first-child), th:not(:first-child) { text-align: right; color: var(--strong); font-variant-numeric: tabular-nums; white-space: nowrap; }
.bars td:first-child { position: relative; padding-bottom: 11px; }
.bar { position: absolute; left: 0; bottom: 4px; height: 3px; border-radius: 2px; background: var(--series); }
.chart { margin: 4px 0 0; }
.plot { position: relative; height: 180px; margin: 10px 0 0 32px; }
.ticks span { position: absolute; left: -32px; right: 0; transform: translateY(50%); font-size: 11px; line-height: 1; color: var(--muted); font-variant-numeric: tabular-nums; }
.ticks span::after { content: ""; position: absolute; left: 32px; right: 0; top: 50%; border-top: 1px solid var(--line); }
.cols { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); column-gap: 2px; }
.col { position: relative; display: flex; align-items: flex-end; justify-content: center; outline: none; }
.col i { display: block; width: 100%; max-width: 24px; background: var(--series); border-radius: 4px 4px 0 0; }
.col:hover i, .col:focus-visible i { background: var(--series-hover); }
.tip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 6px; padding: 6px 10px; border: 1px solid var(--ring); border-radius: 8px; background: var(--raised); color: var(--ink); font-size: 12px; line-height: 1.4; white-space: nowrap; pointer-events: none; z-index: 5; }
.tip b { color: var(--strong); font-size: 14px; }
.col:hover .tip, .col:focus-visible .tip { display: block; }
.col:nth-child(-n + 3) .tip { left: 0; transform: none; }
.col:nth-last-child(-n + 3) .tip { left: auto; right: 0; transform: none; }
.dates { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); column-gap: 2px; margin: 6px 0 0 32px; font-size: 11px; color: var(--muted); }
.dates span { display: flex; justify-content: center; white-space: nowrap; }
.dates span:last-child { justify-content: flex-end; }
@media (max-width: 640px) {
    .dates .minor { visibility: hidden; }
}
details { margin-top: 12px; font-size: 13px; }
summary { cursor: pointer; color: var(--muted); }
summary:hover, summary:focus-visible { color: var(--strong); }
details table { margin-top: 8px; }
.scroll { overflow-x: auto; border: 1px solid var(--ring); background: var(--card); border-radius: 12px; padding: 4px 16px; }
.recent { font-size: 13px; }
.recent td, .recent th { text-align: left; white-space: nowrap; padding: 9px 10px 9px 0; vertical-align: middle; color: var(--ink); }
.recent time { color: var(--strong); }
.clip { display: inline-block; max-width: 160px; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }
.clip.place { max-width: 180px; }
.dots { display: inline-flex; gap: 3px; }
.dots i { width: 8px; height: 8px; border-radius: 50%; background: #8b8b9540; }
.dots i.on { background: var(--series); }
.chips { display: flex; flex-wrap: wrap; gap: 3px; width: 200px; white-space: normal; }
.chip { max-width: 100%; padding: 0 6px; border: 1px solid #8b8b9540; border-radius: 6px; font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.tag { color: var(--strong); }
#show-visits { margin-top: 12px; }
</style>
</head>
<body>
<main>
<header class="top"><h1>naidenko.dev stats</h1>${goatcounterLink(goatcounter, filter)}</header>
<p class="note">Counted by the site's own Worker: no cookies, no IP addresses. Days and times are UTC. A visitor is one network and browser on one day, so people behind one office address count as one, and a phone that changes networks as several. Generated ${now.toISOString().slice(0, 16).replace("T", " ")} UTC.</p>
<p class="note" id="owner"></p>
${filterForm(filter, data.options, now)}
<p class="note">Showing ${escapeHtml(range)}${filter.country ? `, ${escapeHtml(countryName(filter.country))}` : ""}${filter.ref ? `, ?ref=${escapeHtml(filter.ref)}` : ""}.</p>
<div class="tiles">${tiles}</div>
<p class="note">${period ? `Arrows compare with ${escapeHtml(period)}. ` : ""}A bounce is a visit that left within ${BOUNCE_SECONDS} s. The bounce rate and the average time count only visits that reported their time; a phone can close a page before it does.</p>
<nav class="jump" aria-label="Parts of this page">${GROUPS.map(([id, title]) => `<a href="#${id}">${title}</a>`).join("")}</nav>
${group("traffic", "Traffic", grid(traffic))}
${group("sources", "Sources", grid(sources))}
${group("audience", "Audience", grid(audience))}
${group("technology", "Technology", grid(technology))}
${group("engagement", "Engagement", grid(engagement))}
${group("latest-visits", "Latest visits", recentVisits(data.recent))}
</main>
${OWNER_SCRIPT}
</body>
</html>`;
}

export async function handleStats(request: Request, deps: StatsDeps): Promise<Response> {
    if (!deps.password) return new Response("Not found", { status: 404 });
    const network = networkKey(request.headers.get("CF-Connecting-IP") ?? "");
    if (!(await deps.rateLimit(`stats:${network}`))) {
        return new Response("Too many attempts. Try again in a minute.", {
            status: 429,
            headers: { "Retry-After": "60", "Cache-Control": "no-store" }
        });
    }
    const given = passwordFrom(request.headers.get("Authorization"));
    // NFC on both sides, as RFC 7617 and NIST SP 800-63B-4 expect: "é" can arrive as one code point or two.
    if (given === null || !sameText(given.normalize("NFC"), deps.password.normalize("NFC"))) {
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

/** The visits the filter selects, as `f`, for every query below; ?1 to ?4 are the filter, ?4's "*" a prefix match (refFilterOf). */
const FILTERED = `WITH f AS (SELECT * FROM visits WHERE day >= ?1 AND day <= ?2 AND (?3 = '' OR country = ?3)
    AND (?4 = '' OR ref = ?4 OR (substr(?4, -1) = '*' AND substr(ref, 1, length(?4) - 1) = substr(?4, 1, length(?4) - 1))))`;
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
const TOTALS = `SELECT COUNT(*) AS views, COALESCE(SUM(path = '/'), 0) AS homeViews,
        COALESCE(SUM(path = '${samplePage.path}'), 0) AS sampleViews, ${PEOPLE} AS visitors, ${RETURNING} AS returners,
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
             WHERE e.name = 'section_view' AND f.path = '/' GROUP BY e.detail ORDER BY n DESC`
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
        filtered(
            `SELECT e.detail AS label, COUNT(DISTINCT e.visit) AS n FROM events e JOIN f ON e.visit = f.id
             WHERE e.name = 'section_view' AND f.path = '${samplePage.path}' GROUP BY e.detail ORDER BY n DESC`
        ),
        ...(before ? [select(before, TOTALS)] : [])
    ]);
    const [totals, days, months, pages, refs, referrers, countries, regions, cities, networks, devices, browsers, systems, languages] =
        results;
    const [screens, sections, nav, durations, events, recent, countryOptions, refOptions, sampleSections, previous] = results.slice(14);
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
        sampleSections: rows<Row>(sampleSections),
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
