import { REF } from "./hits";

/** RFC 8288 Link header on the home page: the Markdown version, and llms.txt for agents. */
export const HOME_LINKS = '</index.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"; type="text/plain"';

/** The q-value an Accept header gives a media type; 0 when it is not listed (wildcards do not count). */
function quality(accept: string, type: string): number {
    for (const part of accept.split(",")) {
        const [name, ...params] = part.trim().split(";");
        if (name.trim().toLowerCase() !== type) continue;
        const q = params.map(param => param.trim()).find(param => param.startsWith("q="));
        return q ? Number(q.slice(2)) || 0 : 1;
    }
    return 0;
}

/** True when the client names text/markdown and ranks it no lower than text/html. */
export function wantsMarkdown(accept: string | null): boolean {
    if (!accept) return false;
    const markdown = quality(accept, "text/markdown");
    return markdown > 0 && markdown >= quality(accept, "text/html");
}

/**
 * The tag LinkedIn's crawler should keep, such as "linkedin" in /?ref=linkedin, or null. LinkedIn
 * replaces a shared link with the page's canonical address, which drops ?ref=; search engines
 * still see a single canonical page.
 */
export function sharedRef(request: Request): string | null {
    if (!/linkedinbot/i.test(request.headers.get("User-Agent") ?? "")) return null;
    const ref = (new URL(request.url).searchParams.get("ref") ?? "").toLowerCase();
    return ref && REF.test(ref) ? ref : null;
}

/** The canonical address with the link's tag, as LinkedIn should link to it. */
export function taggedUrl(canonical: string, ref: string): string {
    const url = new URL(canonical);
    url.searchParams.set("ref", ref);
    return url.href;
}

/** The page with its canonical link and og:url carrying the link's tag. */
export function tagPage(page: Response, ref: string): Response {
    const tag = (attribute: string) => ({
        element(element: Element) {
            const value = element.getAttribute(attribute);
            if (value) element.setAttribute(attribute, taggedUrl(value, ref));
        }
    });
    return new HTMLRewriter().on('link[rel="canonical"]', tag("href")).on('meta[property="og:url"]', tag("content")).transform(page);
}

export interface PageDeps {
    /** The response, exactly as the assets would serve it. */
    page(): Promise<Response>;
    /** The page with the link's tag in its canonical address (tagPage; HTMLRewriter exists only in the Worker). */
    tag(page: Response, ref: string): Response;
}

export interface HomeDeps extends PageDeps {
    fetchAsset(path: string): Promise<Response>;
}

/** Serves a static file, an HTML page with its canonical address tagged for LinkedIn's crawler (sharedRef). */
export async function handlePage(request: Request, deps: PageDeps): Promise<Response> {
    const page = await deps.page();
    const ref = sharedRef(request);
    return ref && page.headers.get("Content-Type")?.startsWith("text/html") ? deps.tag(page, ref) : page;
}

/** Serves "/" as HTML to browsers and as Markdown to agents that ask for it (Accept: text/markdown). */
export async function handleHome(request: Request, deps: HomeDeps): Promise<Response> {
    if (wantsMarkdown(request.headers.get("Accept"))) {
        const text = await (await deps.fetchAsset("/index.md")).text();
        return new Response(request.method === "HEAD" ? null : text, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Vary": "Accept",
                "Link": HOME_LINKS,
                // The usual rough measure: about four characters to a token.
                "x-markdown-tokens": String(Math.ceil(text.length / 4)),
                "X-Content-Type-Options": "nosniff"
            }
        });
    }
    const page = await handlePage(request, deps);
    const headers = new Headers(page.headers);
    headers.set("Link", HOME_LINKS);
    headers.append("Vary", "Accept");
    return new Response(page.body, { status: page.status, statusText: page.statusText, headers });
}
