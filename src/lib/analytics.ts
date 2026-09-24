/**
 * Two counters, neither of which stores anything in the browser, so there is no consent banner:
 * GoatCounter for its dashboard (six months of history on the free plan), and the site's own
 * counter in its Worker (/api/hit into D1), which keeps the counts for good.
 */
export const GOATCOUNTER_URL = process.env.NEXT_PUBLIC_GOATCOUNTER_URL ?? "";
export const HIT_URL = "/api/hit";

declare global {
    interface Window {
        goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void };
    }
}

export interface Hit {
    kind: "view" | "event";
    name: string;
    detail?: string;
    referrer?: string;
}

/** An event's parameters as one short detail, such as "badge" or "contact-rate_limit". */
export function detailOf(params: Record<string, string>): string {
    return Object.values(params)
        .filter(Boolean)
        .join("-")
        .replace(/[^\w.-]/g, "_")
        .slice(0, 64);
}

/** GoatCounter's name for an event; it may not start with "/". */
export function goatcounterPath(event: string, detail: string): string {
    return detail ? `${event}-${detail}` : event;
}

function send(hit: Hit): void {
    const body = JSON.stringify(hit);
    try {
        if (navigator.sendBeacon?.(HIT_URL, body)) return;
    } catch {
        // Some browsers refuse beacons; fetch below still gets through.
    }
    fetch(HIT_URL, { method: "POST", body, keepalive: true }).catch(() => {});
}

export function trackView(): void {
    send({ kind: "view", name: window.location.pathname, referrer: document.referrer });
}

/** Counts an event in both counters. */
export function track(event: string, params: Record<string, string> = {}): void {
    const detail = detailOf(params);
    send({ kind: "event", name: event, detail });
    window.goatcounter?.count?.({ path: goatcounterPath(event, detail), event: true });
}

/**
 * The event for a click: an element with data-track="<event>" and data-track-<param>="<value>", or
 * the link inside Toptal's badge (#r), which is pasted verbatim and cannot carry attributes.
 */
export function eventFor(target: EventTarget | null): { name: string; params: Record<string, string> } | null {
    if (!(target instanceof Element)) return null;
    const element = target.closest("[data-track], #r a");
    if (!element) return null;
    if (element.matches("#r a")) return { name: "hire_me_toptal", params: { placement: "badge" } };
    const params: Record<string, string> = {};
    for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.startsWith("data-track-"))
            params[attribute.name.slice("data-track-".length).replace(/-/g, "_")] = attribute.value;
    }
    return { name: element.getAttribute("data-track") ?? "", params };
}
