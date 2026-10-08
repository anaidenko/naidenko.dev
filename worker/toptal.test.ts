import { describe, expect, it, vi } from "vitest";

import { handleToptalHost, isToptalHost } from "./toptal";

const page = () => new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
const missing = () => new Response("<html>404</html>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });

describe("isToptalHost", () => {
    it("knows the host made for Toptal's links, and the local one the tests use", () => {
        expect(isToptalHost("toptal.naidenko.dev")).toBe(true);
        expect(isToptalHost("toptal.localhost")).toBe(true);
        expect(isToptalHost("naidenko.dev")).toBe(false);
        expect(isToptalHost("nottoptal.naidenko.dev")).toBe(false);
    });
});

describe("handleToptalHost", () => {
    it("serves the site's pages, kept out of search engines", async () => {
        const route = vi.fn(async () => page());
        const response = await handleToptalHost(new Request("https://toptal.naidenko.dev/audit"), {
            route,
            notFound: async () => missing()
        });
        expect(route).toHaveBeenCalledOnce();
        expect(response.status).toBe(200);
        expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
        expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
        expect(await response.text()).toBe("<html></html>");
    });

    it("answers the form's endpoint and the statistics with the 404 page", async () => {
        for (const path of ["/api/contact", "/stats"]) {
            const route = vi.fn(async () => page());
            const response = await handleToptalHost(new Request(`https://toptal.naidenko.dev${path}`, { method: "POST" }), {
                route,
                notFound: async () => missing()
            });
            expect(route, path).not.toHaveBeenCalled();
            expect(response.status, path).toBe(404);
            expect(response.headers.get("X-Robots-Tag"), path).toBe("noindex");
            expect(await response.text(), path).toBe("<html>404</html>");
        }
    });
});
