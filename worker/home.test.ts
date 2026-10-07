import { describe, expect, it, vi } from "vitest";

import { HOME_LINKS, handleHome, handlePage, sharedRef, taggedUrl, wantsMarkdown } from "./home";

const LINKEDIN_BOT = "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function visit(url: string, userAgent: string) {
    return new Request(url, { headers: { "User-Agent": userAgent, "Accept": "text/html" } });
}

describe("sharedRef", () => {
    it("gives LinkedIn's crawler the link's tag, lowercased as the counter keeps it", () => {
        expect(sharedRef(visit("https://naidenko.dev/?ref=linkedin", LINKEDIN_BOT))).toBe("linkedin");
        expect(sharedRef(visit("https://naidenko.dev/?ref=LinkedIn", LINKEDIN_BOT))).toBe("linkedin");
    });

    it("gives nothing to browsers, to an untagged link, or to a tag the counter would refuse", () => {
        expect(sharedRef(visit("https://naidenko.dev/?ref=linkedin", CHROME))).toBeNull();
        expect(sharedRef(visit("https://naidenko.dev/", LINKEDIN_BOT))).toBeNull();
        expect(sharedRef(visit("https://naidenko.dev/?ref=", LINKEDIN_BOT))).toBeNull();
        expect(sharedRef(visit("https://naidenko.dev/?ref=%3Cscript%3E", LINKEDIN_BOT))).toBeNull();
    });
});

describe("taggedUrl", () => {
    it("adds the tag to the page's canonical address", () => {
        expect(taggedUrl("https://naidenko.dev", "linkedin")).toBe("https://naidenko.dev/?ref=linkedin");
    });
});

describe("wantsMarkdown", () => {
    it("answers agents that ask for Markdown first or equally", () => {
        expect(wantsMarkdown("text/markdown")).toBe(true);
        expect(wantsMarkdown("text/markdown, text/html;q=0.9")).toBe(true);
        expect(wantsMarkdown("text/html, text/markdown")).toBe(true);
    });

    it("keeps HTML for browsers and for agents that prefer it", () => {
        expect(wantsMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")).toBe(false);
        expect(wantsMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
        expect(wantsMarkdown("text/markdown;q=0")).toBe(false);
        expect(wantsMarkdown(null)).toBe(false);
        expect(wantsMarkdown("*/*")).toBe(false);
    });
});

const html = () =>
    new Response("<!doctype html><h1>Andrii Naidenko</h1>", { headers: { "Content-Type": "text/html", "X-Frame-Options": "DENY" } });
const markdown = () =>
    new Response("# Andrii Naidenko\n\nFull-stack and Mobile Developer.\n", { headers: { "Content-Type": "text/markdown" } });

function get(accept?: string, method = "GET") {
    return new Request("https://naidenko.dev/", { method, headers: accept ? { Accept: accept } : {} });
}

describe("handleHome", () => {
    it("serves the page's Markdown to an agent, with its token estimate", async () => {
        const fetchAsset = vi.fn(async (_path: string) => markdown());
        const res = await handleHome(get("text/markdown"), { page: async () => html(), fetchAsset, tag: page => page });
        expect(fetchAsset).toHaveBeenCalledWith("/index.md");
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
        expect(res.headers.get("Vary")).toContain("Accept");
        expect(Number(res.headers.get("x-markdown-tokens"))).toBeGreaterThan(0);
        expect(res.headers.get("Link")).toBe(HOME_LINKS);
        expect(await res.text()).toMatch(/^# Andrii Naidenko/);
    });

    it("serves browsers the HTML page unchanged, plus the Link and Vary headers", async () => {
        const res = await handleHome(get("text/html"), { page: async () => html(), fetchAsset: async () => markdown(), tag: page => page });
        expect(res.headers.get("Content-Type")).toBe("text/html");
        expect(res.headers.get("X-Frame-Options")).toBe("DENY");
        expect(res.headers.get("Link")).toBe(HOME_LINKS);
        expect(res.headers.get("Vary")).toContain("Accept");
        expect(await res.text()).toContain("<h1>");
    });

    it("tags the canonical address for LinkedIn's crawler, which would otherwise drop ?ref=", async () => {
        const tag = vi.fn((_page: Response, ref: string) => new Response(`tagged ${ref}`, { headers: { "Content-Type": "text/html" } }));
        const res = await handleHome(visit("https://naidenko.dev/?ref=linkedin", LINKEDIN_BOT), {
            page: async () => html(),
            fetchAsset: async () => markdown(),
            tag
        });
        expect(tag).toHaveBeenCalledWith(expect.any(Response), "linkedin");
        expect(await res.text()).toBe("tagged linkedin");
        expect(res.headers.get("Link")).toBe(HOME_LINKS);
    });

    it("leaves the canonical address alone for a browser that followed the same link", async () => {
        const tag = vi.fn((page: Response) => page);
        const res = await handleHome(visit("https://naidenko.dev/?ref=linkedin", CHROME), {
            page: async () => html(),
            fetchAsset: async () => markdown(),
            tag
        });
        expect(tag).not.toHaveBeenCalled();
        expect(await res.text()).toContain("<h1>");
    });

    it("answers HEAD for Markdown without a body", async () => {
        const res = await handleHome(get("text/markdown", "HEAD"), {
            page: async () => html(),
            fetchAsset: async () => markdown(),
            tag: page => page
        });
        expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
        expect(await res.text()).toBe("");
    });
});

describe("handlePage", () => {
    const png = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });

    it("tags the canonical address of any HTML page for LinkedIn's crawler", async () => {
        const tag = vi.fn((_page: Response, ref: string) => new Response(`tagged ${ref}`, { headers: { "Content-Type": "text/html" } }));
        const res = await handlePage(visit("https://naidenko.dev/audit?ref=linkedin", LINKEDIN_BOT), { page: async () => html(), tag });
        expect(tag).toHaveBeenCalledWith(expect.any(Response), "linkedin");
        expect(await res.text()).toBe("tagged linkedin");
    });

    it("leaves the page alone for a browser that followed the same link", async () => {
        const tag = vi.fn((page: Response) => page);
        const res = await handlePage(visit("https://naidenko.dev/audit?ref=linkedin", CHROME), { page: async () => html(), tag });
        expect(tag).not.toHaveBeenCalled();
        expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("leaves a file that is not HTML alone, even for LinkedIn's crawler", async () => {
        const tag = vi.fn((page: Response) => page);
        const res = await handlePage(visit("https://naidenko.dev/audit/og.png?ref=linkedin", LINKEDIN_BOT), {
            page: async () => png(),
            tag
        });
        expect(tag).not.toHaveBeenCalled();
        expect(res.headers.get("Content-Type")).toBe("image/png");
    });
});
