import { readLimited } from "./http";

export const MAX_HIT_BYTES = 1024;

export interface HitRow {
    /** UTC, YYYY-MM-DD. */
    day: string;
    kind: "view" | "event";
    /** A page path for a view, an event name for an event. */
    name: string;
    detail: string;
    referrer: string;
    country: string;
    device: "mobile" | "tablet" | "desktop";
}

export interface HitDeps {
    /** True while the key is under its limit. */
    rateLimit(key: string): Promise<boolean>;
    record(row: HitRow): Promise<unknown>;
    now(): Date;
    /** The visitor's country as Cloudflare resolves it, or "". */
    country: string;
}

const NAME = /^[\w/.-]{1,64}$/;
const DETAIL = /^[\w.-]{0,64}$/;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|facebookexternalhit|embedly/i;

export function deviceOf(userAgent: string): HitRow["device"] {
    if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) return "tablet";
    return /Mobi|iPhone|Android/i.test(userAgent) ? "mobile" : "desktop";
}

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

function fromThisSite(origin: string | null, host: string): boolean {
    if (!origin) return true;
    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

const empty = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });

/** Counts a page view or a click. The visitor learns nothing from the answer, so it is always empty. */
export async function handleHit(request: Request, deps: HitDeps): Promise<Response> {
    if (request.method !== "POST") return empty(405, { Allow: "POST" });
    const url = new URL(request.url);
    if (!fromThisSite(request.headers.get("Origin"), url.host)) return empty(403);
    const userAgent = request.headers.get("User-Agent") ?? "";
    if (userAgent === "" || BOT.test(userAgent)) return empty(204);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip && !(await deps.rateLimit(`hit:${ip}`))) return empty(429);

    const raw = await readLimited(request, MAX_HIT_BYTES);
    if (raw === null) return empty(413);
    let payload: Record<string, unknown>;
    try {
        const parsed: unknown = JSON.parse(raw);
        payload = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
        return empty(400);
    }
    const { kind, name } = payload;
    const detail = payload.detail ?? "";
    if ((kind !== "view" && kind !== "event") || typeof name !== "string" || !NAME.test(name)) return empty(400);
    if (typeof detail !== "string" || !DETAIL.test(detail)) return empty(400);

    const row: HitRow = {
        day: deps.now().toISOString().slice(0, 10),
        kind,
        name,
        detail: kind === "event" ? detail : "",
        referrer: kind === "view" ? referrerHost(payload.referrer, url.hostname) : "",
        country: deps.country.slice(0, 2).toUpperCase(),
        device: deviceOf(userAgent)
    };
    try {
        await deps.record(row);
    } catch (error) {
        console.error("hit: record failed", error);
    }
    return empty(204);
}

/** Adds one to the row's count for its day. */
export function recordHit(db: D1Database, row: HitRow): Promise<D1Result> {
    return db
        .prepare(
            `INSERT INTO counts (day, kind, name, detail, referrer, country, device, n) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
             ON CONFLICT (day, kind, name, detail, referrer, country, device) DO UPDATE SET n = n + 1`
        )
        .bind(row.day, row.kind, row.name, row.detail, row.referrer, row.country, row.device)
        .run();
}
