import { describe, expect, it } from "vitest";

import { AI_CRAWLERS, robotsTxt } from "./robots";
import { asToptalBuild } from "./toptal-build.testing";

describe("robotsTxt", () => {
    it("welcomes every crawler on naidenko.dev and points at the sitemap", () => {
        const text = robotsTxt();
        expect(text).toContain("User-Agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /\n");
        expect(text).toContain("Sitemap: https://naidenko.dev/sitemap.xml\n");
    });

    it("keeps AI crawlers off the Toptal build, lets the rest read its noindex, and names no sitemap", async () => {
        const { robotsTxt: toptal } = await asToptalBuild(() => import("./robots"));
        const text = toptal();
        expect(text).toContain(`${AI_CRAWLERS.map(name => `User-Agent: ${name}`).join("\n")}\nDisallow: /\n`);
        expect(text).toContain("User-Agent: *\nContent-Signal: search=no, ai-input=no, ai-train=no\nAllow: /\n");
        expect(text).not.toContain("Sitemap");
        expect(text.replaceAll("toptal.naidenko.dev", "")).not.toContain("naidenko.dev");
    });

    it("keeps naidenko.dev's file as it was in public/", () => {
        expect(robotsTxt()).toBe(
            "# Search engines, link previews and AI assistants are all welcome: the page is a public résumé.\n# Content Signals (contentsignals.org) state the same for search, AI answers and AI training.\nUser-Agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: /\n\nSitemap: https://naidenko.dev/sitemap.xml\n"
        );
    });
});
