/**
 * Google Analytics 4 behind consent. Nothing from Google loads until the visitor allows it, as EU
 * rules require for analytics cookies, and advertising storage stays denied either way.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const CONSENT_KEY = "analytics-consent";
const CONSENT_EVENT = "analytics-consent-change";

export type Consent = "granted" | "denied";
type ConsentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

/** The visitor's stored choice; null when they have not chosen yet or storage is blocked. */
export function readConsent(storage: Pick<Storage, "getItem"> | undefined): Consent | null {
    try {
        const value = storage?.getItem(CONSENT_KEY);
        return value === "granted" || value === "denied" ? value : null;
    } catch {
        return null;
    }
}

/** Stores the choice, or forgets it when given null. */
export function saveConsent(storage: ConsentStorage | undefined, choice: Consent | null): void {
    try {
        if (choice) storage?.setItem(CONSENT_KEY, choice);
        else storage?.removeItem(CONSENT_KEY);
    } catch {
        // Storage is blocked: the choice lasts for this page view only.
    }
}

/** Names of the Google Analytics cookies in a document.cookie string. */
export function gaCookieNames(cookies: string): string[] {
    return cookies
        .split(";")
        .map(part => part.split("=")[0].trim())
        .filter(name => name === "_ga" || name.startsWith("_ga_"));
}

function browserStorage(): Storage | undefined {
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

export function getConsent(): Consent | null {
    return readConsent(browserStorage());
}

export function subscribeConsent(onChange: () => void): () => void {
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CONSENT_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

/** Records the choice (null opens the banner again). Anything but "granted" also clears Google's cookies. */
export function setConsent(choice: Consent | null): void {
    saveConsent(browserStorage(), choice);
    // A no-op on the first grant (gtag is not loaded yet); needed when consent returns mid-visit.
    if (choice === "granted") window.gtag?.("consent", "update", { analytics_storage: "granted" });
    else {
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
        for (const name of gaCookieNames(document.cookie)) {
            document.cookie = `${name}=; Max-Age=0; path=/`;
            document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}`;
        }
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Sends a GA4 event when the visitor has allowed analytics; otherwise does nothing. */
export function track(event: string, params: Record<string, string> = {}): void {
    if (getConsent() === "granted") window.gtag?.("event", event, params);
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
