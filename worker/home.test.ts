import { describe, expect, it, vi } from "vitest";

import { HOME_LINKS, handleHome, wantsMarkdown } from "./home";

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
        const res = await handleHome(get("text/markdown"), { page: async () => html(), fetchAsset });
        expect(fetchAsset).toHaveBeenCalledWith("/index.md");
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
        expect(res.headers.get("Vary")).toContain("Accept");
        expect(Number(res.headers.get("x-markdown-tokens"))).toBeGreaterThan(0);
        expect(res.headers.get("Link")).toBe(HOME_LINKS);
        expect(await res.text()).toMatch(/^# Andrii Naidenko/);
    });

    it("serves browsers the HTML page unchanged, plus the Link and Vary headers", async () => {
        const res = await handleHome(get("text/html"), { page: async () => html(), fetchAsset: async () => markdown() });
        expect(res.headers.get("Content-Type")).toBe("text/html");
        expect(res.headers.get("X-Frame-Options")).toBe("DENY");
        expect(res.headers.get("Link")).toBe(HOME_LINKS);
        expect(res.headers.get("Vary")).toContain("Accept");
        expect(await res.text()).toContain("<h1>");
    });

    it("answers HEAD for Markdown without a body", async () => {
        const res = await handleHome(get("text/markdown", "HEAD"), { page: async () => html(), fetchAsset: async () => markdown() });
        expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
        expect(await res.text()).toBe("");
    });
});
