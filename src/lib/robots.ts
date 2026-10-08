import { site } from "@/content/site";

import { TOPTAL_SITE } from "./variant";

/**
 * Crawlers that gather pages for AI models or AI search, kept off the Toptal build. Link previews
 * (LinkedIn's, X's, Slack's) still read it, and search engines see each page's noindex, which a
 * Disallow would hide from them.
 */
export const AI_CRAWLERS = [
    "GPTBot",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-SearchBot",
    "CCBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bytespider",
    "Amazonbot",
    "meta-externalagent"
];

/** /robots.txt: naidenko.dev welcomes every crawler; the Toptal build keeps search and AI out. */
export function robotsTxt(): string {
    if (TOPTAL_SITE)
        return [
            `# ${site.domain} is the address for Toptal's links: not for search engines or AI models.`,
            "# Every page carries noindex. Content Signals (contentsignals.org) say the same.",
            ...AI_CRAWLERS.map(name => `User-Agent: ${name}`),
            "Disallow: /",
            "",
            "User-Agent: *",
            "Content-Signal: search=no, ai-input=no, ai-train=no",
            "Allow: /",
            ""
        ].join("\n");
    return [
        "# Search engines, link previews and AI assistants are all welcome: the page is a public résumé.",
        "# Content Signals (contentsignals.org) state the same for search, AI answers and AI training.",
        "User-Agent: *",
        "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
        "Allow: /",
        "",
        `Sitemap: ${site.url}/sitemap.xml`,
        ""
    ].join("\n");
}
