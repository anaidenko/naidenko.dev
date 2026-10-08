/**
 * The host made for Toptal's links (toptal.naidenko.dev). Its pages are the site's own, which
 * hide the form and the email on this host (src/lib/toptal.ts); toptal.localhost is the tests'.
 */
export function isToptalHost(hostname: string): boolean {
    return hostname.startsWith("toptal.");
}

/** What the Toptal host does not serve: the contact form's endpoint and the owner's statistics. */
const CLOSED = new Set(["/api/contact", "/stats"]);

export interface ToptalDeps {
    /** The site's usual answer to the request. */
    route(): Promise<Response>;
    /** The site's 404 page. */
    notFound(): Promise<Response>;
}

/** Serves the Toptal host: the site minus CLOSED, with every answer kept out of search engines. */
export async function handleToptalHost(request: Request, deps: ToptalDeps): Promise<Response> {
    const closed = CLOSED.has(new URL(request.url).pathname);
    const response = closed ? await deps.notFound() : await deps.route();
    const answer = new Response(response.body, {
        status: closed ? 404 : response.status,
        statusText: closed ? "Not Found" : response.statusText,
        headers: response.headers
    });
    answer.headers.set("X-Robots-Tag", "noindex");
    return answer;
}
