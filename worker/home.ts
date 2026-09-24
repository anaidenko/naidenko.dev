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

export interface HomeDeps {
    /** The HTML page, exactly as the assets would serve it. */
    page(): Promise<Response>;
    fetchAsset(path: string): Promise<Response>;
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
    const page = await deps.page();
    const headers = new Headers(page.headers);
    headers.set("Link", HOME_LINKS);
    headers.append("Vary", "Accept");
    return new Response(page.body, { status: page.status, statusText: page.statusText, headers });
}
