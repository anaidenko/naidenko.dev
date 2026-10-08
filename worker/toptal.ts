/**
 * Toptal's links: the host made for them (toptal.naidenko.dev) serves the Toptal build from a
 * Worker of its own, and naidenko.dev sends a page tagged for Toptal there.
 */

/**
 * Whether a link was tagged on Toptal (?ref=toptal… or utm_source=toptal…). The Worker cannot load
 * src/lib/toptal.ts, which reads the build's variables, so the tests hold this to its toptalTag.
 */
export function isToptalLink(search: string): boolean {
    const params = new URLSearchParams(search);
    return tagOf(params.get("ref") || params.get("utm_source") || "").startsWith("toptal");
}

const tagOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]/g, "");

/**
 * A link's query as the Toptal host wants it: that host counts a visit with no tag as "toptal" and
 * a bare tag as "toptal-<tag>", so "toptal" goes and "toptal-509168" becomes "509168". A tag whose
 * shorter form would count differently ("toptalx", "toptal-toptal") stays as it is.
 */
function onToptalHost(search: string): string {
    const params = new URLSearchParams(search);
    for (const name of ["ref", "utm_source"]) {
        const tag = tagOf(params.get(name) ?? "");
        const rest = tag.slice("toptal-".length);
        if (tag === "toptal") params.delete(name);
        else if (tag.startsWith("toptal-") && rest && !rest.startsWith("toptal")) params.set(name, rest);
    }
    const query = params.toString();
    return query ? `?${query}` : "";
}

/**
 * A page asked for with a Toptal tag, answered with a move to the same path on the Toptal host, its
 * tag shortened (onToptalHost): naidenko.dev/audit?ref=toptal-509168, an application's old link,
 * lands on toptal.naidenko.dev/audit?ref=509168. Null for anything else; the API and the owner's
 * statistics stay where they are.
 */
export function toptalRedirect(request: Request, origin: string): Response | null {
    if (!origin || (request.method !== "GET" && request.method !== "HEAD")) return null;
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/") || url.pathname === "/stats" || !isToptalLink(url.search)) return null;
    return new Response(null, {
        status: 302,
        headers: { "Location": `${origin}${url.pathname}${onToptalHost(url.search)}`, "Cache-Control": "no-store" }
    });
}

export interface ToptalSiteDeps {
    /** naidenko.dev's Worker counts the visit: its database, its visitor key and its ignored networks. */
    hit(): Promise<Response>;
    /** The Toptal build's file for the request, or its 404 page. */
    asset(): Promise<Response>;
}

/** The Toptal host: its build and the visit counter, every answer kept out of search engines. */
export async function handleToptalSite(request: Request, deps: ToptalSiteDeps): Promise<Response> {
    const response = new URL(request.url).pathname === "/api/hit" ? await deps.hit() : await deps.asset();
    const answer = new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
    answer.headers.set("X-Robots-Tag", "noindex");
    return answer;
}
