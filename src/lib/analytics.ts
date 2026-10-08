/**
 * Two counters, neither of which stores anything in a visitor's browser, so there is no consent
 * banner: GoatCounter for its dashboard, and the site's own counter in its Worker (/api/hit into
 * D1), which keeps each visit, its clicks and how long the page was in front of the visitor.
 */
export const GOATCOUNTER_URL = process.env.NEXT_PUBLIC_GOATCOUNTER_URL ?? "";
export const HIT_URL = "/api/hit";
/** GoatCounter's count.js skips a browser with this flag set to "t"; /stats sets it in the owner's. */
export const SKIP_FLAG = "skipgc";

declare global {
    interface Window {
        goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void };
    }
}

type Hit =
    | { kind: "view"; visit: string; path: string; referrer: string; ref: string; screen: number | null }
    | { kind: "event"; visit: string; name: string; detail: string }
    | { kind: "time"; visit: string; seconds: number };

/** The visit this page is counted as, or null when it is not counted. */
let visit: string | null = null;
/** Whether this browser's hits ask to be counted even from a network the counter ignores. */
let force = false;
/** Whether a visit already started in this tab: a later one is a move within the site. */
let landed = false;

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

/** The tag of a link Andrii placed, such as "linkedin" in ?ref=linkedin. */
export function refOf(search: string): string {
    const params = new URLSearchParams(search);
    const tag = params.get("ref") || params.get("utm_source") || "";
    return tag
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 40);
}

/** A visit's tag: its link's, or "toptal" on the host made for Toptal's links, which needs none. */
export function landingRef(search: string, hostname: string): string {
    return refOf(search) || (hostname.startsWith("toptal.") ? "toptal" : "");
}

/**
 * A link within the site carrying this page's tag, so a full page load keeps it. The fallback is
 * the tag of a visit through Toptal after a move within the site dropped it from the address.
 */
export function withRef(href: string, search: string, fallback = ""): string {
    const tag = refOf(search) || fallback;
    if (!tag) return href;
    const url = new URL(href, "https://site.invalid");
    url.searchParams.set("ref", tag);
    return `${url.pathname}${url.search}${url.hash}`;
}

/** The referring site's origin: the counter keeps only its host, and a full address can be long. */
export function originOf(referrer: string): string {
    try {
        return new URL(referrer).origin;
    } catch {
        return "";
    }
}

/**
 * Whether this page load goes uncounted: ?preview=1, the owner's marked browser, and the checks
 * GoatCounter's count.js makes (an automated browser, a frame, prerendering).
 */
export function isExcluded(win: Window): boolean {
    if (new URLSearchParams(win.location.search).has("preview")) return true;
    try {
        if (win.localStorage.getItem(SKIP_FLAG) === "t") return true;
    } catch {
        // A browser that refuses storage cannot carry the flag, so it is counted.
    }
    const w = win as Window & Record<string, unknown>;
    const d = win.document as Document & Record<string, unknown>;
    if (win.navigator.webdriver || w.callPhantom || w._phantom || w.phantom || w.__nightmare) return true;
    if (d.__selenium_unwrapped || d.__webdriver_evaluate || d.__driver_evaluate) return true;
    if (win.self !== win.top) return true;
    return (d.visibilityState as string) === "prerender";
}

/**
 * Whether the owner pressed "Count it again" on /stats in this browser. Its hits then pass the
 * counter's ignored networks, so the owner can test the counter from home.
 */
export function chosenToCount(win: Window): boolean {
    try {
        return win.localStorage.getItem(SKIP_FLAG) === "f";
    } catch {
        return false;
    }
}

/** Adds up the time the page was visible, which is the time someone could have been reading it. */
export function createVisibleClock(now: () => number, visible: boolean) {
    let total = 0;
    let since: number | null = visible ? now() : null;
    return {
        show() {
            since ??= now();
        },
        hide() {
            if (since === null) return;
            total += now() - since;
            since = null;
        },
        total(): number {
            return Math.round((total + (since === null ? 0 : now() - since)) / 1000);
        }
    };
}

function send(hit: Hit): void {
    const body = JSON.stringify(force ? { ...hit, force } : hit);
    try {
        if (navigator.sendBeacon?.(HIT_URL, body)) return;
    } catch {
        // Some browsers refuse beacons; fetch below still gets through.
    }
    fetch(HIT_URL, { method: "POST", body, keepalive: true }).catch(() => {});
}

/**
 * Counts a page: the view now, each section once as it scrolls into view, and the visible time
 * whenever the page is hidden or left. A move to another page within the site is a new visit, with
 * no referrer or tag of its own. Returns what ends the visit, reporting its time.
 */
export function startVisit(win: Window): () => void {
    const id = win.crypto.randomUUID();
    visit = id;
    force = chosenToCount(win);
    const doc = win.document;
    const internal = landed;
    landed = true;
    send({
        kind: "view",
        visit: id,
        path: win.location.pathname,
        referrer: internal ? "" : originOf(doc.referrer),
        ref: internal ? "" : landingRef(win.location.search, win.location.hostname),
        screen: win.screen.width || null
    });

    const clock = createVisibleClock(() => win.performance.now(), doc.visibilityState === "visible");
    const report = () => send({ kind: "time", visit: id, seconds: clock.total() });
    const onVisibility = () => {
        if (doc.visibilityState === "visible") return clock.show();
        clock.hide();
        report();
    };
    const onPageHide = () => {
        clock.hide();
        report();
    };
    doc.addEventListener("visibilitychange", onVisibility);
    win.addEventListener("pagehide", onPageHide);

    const seen = new Set<string>();
    const observer = new IntersectionObserver(
        entries => {
            for (const { isIntersecting, target } of entries) {
                if (!isIntersecting || seen.has(target.id)) continue;
                seen.add(target.id);
                send({ kind: "event", visit: id, name: "section_view", detail: target.id });
            }
        },
        // A section counts once its top reaches the upper 60% of the screen, where people read.
        { rootMargin: "0px 0px -40% 0px" }
    );
    doc.querySelectorAll("main section[id]").forEach(section => observer.observe(section));

    return () => {
        clock.hide();
        report();
        observer.disconnect();
        doc.removeEventListener("visibilitychange", onVisibility);
        win.removeEventListener("pagehide", onPageHide);
        visit = null;
    };
}

/** Counts an event in both counters, when this page load is counted at all. */
export function track(event: string, params: Record<string, string> = {}): void {
    if (!visit) return;
    const detail = detailOf(params);
    send({ kind: "event", visit, name: event, detail });
    window.goatcounter?.count?.({ path: goatcounterPath(event, detail), event: true });
}

/** Loads GoatCounter's script; it counts the page view itself once loaded. */
export function loadGoatCounter(doc: Document, url: string): HTMLScriptElement {
    const script = doc.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = url;
    doc.body.appendChild(script);
    return script;
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
