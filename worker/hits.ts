import { readLimited } from "./http";
import { type Device, browserOf, deviceOf, inNetworks, isBot, languageOf, osOf, visitorHash } from "./visitor";

export const MAX_HIT_BYTES = 1024;
/** A tab left open in front of someone for hours would skew the average time on the page. */
export const MAX_SECONDS = 3600;

/** What the page may send; everything else about a visit the Worker derives itself. */
export type Hit =
    | { kind: "view"; visit: string; path: string; referrer: string; ref: string; screen: number | null }
    | { kind: "event"; visit: string; name: string; detail: string }
    | { kind: "time"; visit: string; seconds: number };

/** Where a request came from, as Cloudflare resolves its address. The address is not kept. */
export interface Place {
    country: string;
    region: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    asn: number | null;
    network: string;
}

export interface VisitRow extends Place {
    id: string;
    /** ISO time, UTC. */
    at: string;
    /** UTC, YYYY-MM-DD. */
    day: string;
    visitor: string | null;
    path: string;
    referrer: string;
    ref: string;
    device: Device;
    browser: string;
    os: string;
    language: string;
    screen: number | null;
}

export interface EventRow {
    visit: string;
    at: string;
    name: string;
    detail: string;
}

export interface HitDeps {
    /** True while the key is under its limit. */
    rateLimit(key: string): Promise<boolean>;
    recordVisit(row: VisitRow): Promise<unknown>;
    recordEvent(row: EventRow): Promise<unknown>;
    recordTime(visit: string, seconds: number): Promise<unknown>;
    now(): Date;
    place: Place;
    /** CIDR ranges and addresses, comma-separated, whose hits are not counted. */
    ignoredNetworks: string;
    /** The visitor hash's key; empty means visitors are not told apart. */
    visitorKey: string;
}

const VISIT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PATH = /^\/[\w/.-]{0,63}$/;
const NAME = /^[\w.-]{1,64}$/;
const DETAIL = /^[\w.-]{0,64}$/;
/** A link tag, as the page sends it and /stats filters by it. */
export const REF = /^[a-z0-9._-]{0,40}$/;
const MAX_SCREEN = 20_000;

/** The referring site's host, or "" for none, the site itself, or anything that is not a URL. */
export function referrerHost(referrer: unknown, ownHost: string): string {
    if (typeof referrer !== "string" || referrer === "") return "";
    try {
        const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
        return host === ownHost.replace(/^www\./, "") ? "" : host.slice(0, 100);
    } catch {
        return "";
    }
}

export function placeOf(cf: Partial<IncomingRequestCfProperties> | undefined): Place {
    const text = (value: unknown) => (typeof value === "string" ? value.slice(0, 100) : "");
    const number = (value: unknown) => {
        const parsed = typeof value === "number" ? value : typeof value === "string" && value !== "" ? Number(value) : Number.NaN;
        return Number.isFinite(parsed) ? parsed : null;
    };
    return {
        country: text(cf?.country).slice(0, 2).toUpperCase(),
        region: text(cf?.region),
        city: text(cf?.city),
        latitude: number(cf?.latitude),
        longitude: number(cf?.longitude),
        asn: number(cf?.asn),
        network: text(cf?.asOrganization)
    };
}

const matches = (value: unknown, pattern: RegExp): value is string => typeof value === "string" && pattern.test(value);

/** The hit the page sent, or null when anything in it is not what the page sends. */
export function parseHit(payload: unknown): Hit | null {
    if (typeof payload !== "object" || payload === null) return null;
    const hit = payload as Record<string, unknown>;
    if (!matches(hit.visit, VISIT)) return null;
    const visit = hit.visit;
    if (hit.kind === "view") {
        const ref = hit.ref ?? "";
        const screen = hit.screen ?? null;
        const validScreen = screen === null || (Number.isInteger(screen) && (screen as number) > 0 && (screen as number) <= MAX_SCREEN);
        if (!matches(hit.path, PATH) || !matches(ref, REF) || !validScreen) return null;
        const referrer = typeof hit.referrer === "string" ? hit.referrer : "";
        return { kind: "view", visit, path: hit.path, referrer, ref, screen: screen as number | null };
    }
    if (hit.kind === "event") {
        const detail = hit.detail ?? "";
        if (!matches(hit.name, NAME) || !matches(detail, DETAIL)) return null;
        return { kind: "event", visit, name: hit.name, detail };
    }
    if (hit.kind === "time") {
        const seconds = hit.seconds;
        if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 0) return null;
        return { kind: "time", visit, seconds };
    }
    return null;
}

function fromThisSite(origin: string | null, host: string): boolean {
    if (!origin) return true;
    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

const empty = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });

async function record(hit: Hit, request: Request, ip: string, deps: HitDeps): Promise<unknown> {
    const at = deps.now().toISOString();
    if (hit.kind === "event") return deps.recordEvent({ visit: hit.visit, at, name: hit.name, detail: hit.detail });
    if (hit.kind === "time") return deps.recordTime(hit.visit, Math.min(hit.seconds, MAX_SECONDS));
    const userAgent = request.headers.get("User-Agent") ?? "";
    return deps.recordVisit({
        id: hit.visit,
        at,
        day: at.slice(0, 10),
        visitor: await visitorHash(deps.visitorKey, ip, userAgent),
        path: hit.path,
        referrer: referrerHost(hit.referrer, new URL(request.url).hostname),
        ref: hit.ref,
        ...deps.place,
        device: deviceOf(userAgent),
        browser: browserOf(userAgent),
        os: osOf(userAgent),
        language: languageOf(request.headers.get("Accept-Language")),
        screen: hit.screen
    });
}

/**
 * Counts a page view, a click or the visible time. The page ignores the answer, so it is always
 * empty, and an address over its limit is dropped silently: a 429 would only print an error in
 * the visitor's console.
 */
export async function handleHit(request: Request, deps: HitDeps): Promise<Response> {
    if (request.method !== "POST") return empty(405, { Allow: "POST" });
    if (!fromThisSite(request.headers.get("Origin"), new URL(request.url).host)) return empty(403);
    if (isBot(request.headers.get("User-Agent") ?? "")) return empty(204);
    const ip = request.headers.get("CF-Connecting-IP") ?? "";
    if (ip && inNetworks(ip, deps.ignoredNetworks)) return empty(204);
    if (ip && !(await deps.rateLimit(`hit:${ip}`))) return empty(204);

    const raw = await readLimited(request, MAX_HIT_BYTES);
    if (raw === null) return empty(413);
    let payload: unknown;
    try {
        payload = JSON.parse(raw);
    } catch {
        return empty(400);
    }
    const hit = parseHit(payload);
    if (!hit) return empty(400);
    try {
        await record(hit, request, ip, deps);
    } catch (error) {
        console.error("hit: record failed", error);
    }
    return empty(204);
}

/**
 * Adds the visit once, whatever the page resends. Whether it is the visitor's first visit that day
 * and whether they came on an earlier day are fixed now, so the totals survive the hash's erasure.
 */
export function recordVisit(db: D1Database, row: VisitRow): Promise<D1Result> {
    return db
        .prepare(
            `INSERT OR IGNORE INTO visits (id, at, day, visitor, first_today, returned, path, referrer, ref, country, region, city,
                latitude, longitude, asn, network, device, browser, os, language, screen)
             VALUES (?1, ?2, ?3, ?4,
                CASE WHEN ?4 IS NULL THEN 1 ELSE NOT EXISTS (SELECT 1 FROM visits WHERE visitor = ?4 AND day = ?3) END,
                CASE WHEN ?4 IS NULL THEN 0 ELSE EXISTS (SELECT 1 FROM visits WHERE visitor = ?4 AND day < ?3) END,
                ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`
        )
        .bind(
            row.id,
            row.at,
            row.day,
            row.visitor,
            row.path,
            row.referrer,
            row.ref,
            row.country,
            row.region,
            row.city,
            row.latitude,
            row.longitude,
            row.asn,
            row.network,
            row.device,
            row.browser,
            row.os,
            row.language,
            row.screen
        )
        .run();
}

/** Adds the event only to a visit that was counted, so every filter on visits applies to it. */
export function recordEvent(db: D1Database, row: EventRow): Promise<D1Result> {
    return db
        .prepare(`INSERT INTO events (visit, at, name, detail) SELECT ?1, ?2, ?3, ?4 WHERE EXISTS (SELECT 1 FROM visits WHERE id = ?1)`)
        .bind(row.visit, row.at, row.name, row.detail)
        .run();
}

/** The page sends its running total, so the largest one is the visit's time. */
export function recordTime(db: D1Database, visit: string, seconds: number): Promise<D1Result> {
    return db.prepare(`UPDATE visits SET seconds = MAX(COALESCE(seconds, 0), ?2) WHERE id = ?1`).bind(visit, seconds).run();
}
