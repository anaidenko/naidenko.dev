import { describe, expect, it, vi } from "vitest";

import { handleToptalSite, toptalRedirect } from "./toptal";

const ORIGIN = "https://toptal.naidenko.dev";

describe("toptalRedirect", () => {
    const moved = (path: string, method = "GET") => toptalRedirect(new Request(`https://naidenko.dev${path}`, { method }), ORIGIN);

    it("moves a page tagged on Toptal to the same path on the Toptal host, with the tag it needs there", () => {
        const response = moved("/audit?ref=toptal-509168&x=1");
        expect(response?.status).toBe(302);
        expect(response?.headers.get("Location")).toBe(`${ORIGIN}/audit?ref=509168&x=1`);
        expect(moved("/?ref=toptal")?.headers.get("Location")).toBe(`${ORIGIN}/`);
        expect(moved("/?utm_source=toptal", "HEAD")?.headers.get("Location")).toBe(`${ORIGIN}/`);
        expect(moved("/audit/sample?utm_source=toptal&x=1")?.headers.get("Location")).toBe(`${ORIGIN}/audit/sample?x=1`);
        expect(moved("/audit?ref=Toptal-509168")?.headers.get("Location")).toBe(`${ORIGIN}/audit?ref=509168`);
    });

    it("keeps a tag whose shorter form the Toptal host would count differently", () => {
        expect(moved("/?ref=toptalx")?.headers.get("Location")).toBe(`${ORIGIN}/?ref=toptalx`);
        expect(moved("/?ref=toptal-toptal")?.headers.get("Location")).toBe(`${ORIGIN}/?ref=toptal-toptal`);
    });

    it("leaves every other request alone", () => {
        for (const url of ["https://naidenko.dev/", "https://naidenko.dev/audit?ref=linkedin", "https://naidenko.dev/stats?ref=toptal"])
            expect(toptalRedirect(new Request(url), ORIGIN), url).toBeNull();
        expect(toptalRedirect(new Request("https://naidenko.dev/api/hit?ref=toptal", { method: "POST", body: "{}" }), ORIGIN)).toBeNull();
        expect(toptalRedirect(new Request("https://naidenko.dev/api/contact?ref=toptal"), ORIGIN)).toBeNull();
    });

    it("moves nothing without a Toptal host to move to", () => {
        expect(toptalRedirect(new Request("https://naidenko.dev/?ref=toptal"), "")).toBeNull();
    });
});

describe("handleToptalSite", () => {
    const page = (status = 200) => new Response("<html></html>", { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

    it("serves the Toptal build's files, each kept out of search engines", async () => {
        for (const [path, status] of [
            ["/", 200],
            ["/_next/static/chunks/a.js", 200],
            ["/stats", 404]
        ] as const) {
            const hit = vi.fn(async () => new Response(null, { status: 204 }));
            const response = await handleToptalSite(new Request(`${ORIGIN}${path}`), { hit, asset: async () => page(status) });
            expect(hit, path).not.toHaveBeenCalled();
            expect(response.status, path).toBe(status);
            expect(response.headers.get("X-Robots-Tag"), path).toBe("noindex");
            expect(response.headers.get("Content-Type"), path).toBe("text/html; charset=utf-8");
            expect(await response.text(), path).toBe("<html></html>");
        }
    });

    it("hands a visit's hit to naidenko.dev's Worker", async () => {
        const asset = vi.fn(async () => page());
        const response = await handleToptalSite(new Request(`${ORIGIN}/api/hit`, { method: "POST", body: "{}" }), {
            hit: async () => new Response(null, { status: 204 }),
            asset
        });
        expect(asset).not.toHaveBeenCalled();
        expect(response.status).toBe(204);
        expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    });
});
