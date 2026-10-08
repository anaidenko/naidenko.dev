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
    const tag = (params.get("ref") || params.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
    return tag.startsWith("toptal");
}

/**
 * A page asked for with a Toptal tag, answered with a move to the same path and query on the Toptal
 * host (an application's old link, naidenko.dev/audit?ref=toptal-509168); null for anything else.
 * The API and the owner's statistics stay where they are.
 */
export function toptalRedirect(request: Request, origin: string): Response | null {
    if (!origin || (request.method !== "GET" && request.method !== "HEAD")) return null;
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/") || url.pathname === "/stats" || !isToptalLink(url.search)) return null;
    return new Response(null, {
        status: 302,
        headers: { "Location": `${origin}${url.pathname}${url.search}`, "Cache-Control": "no-store" }
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
