import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

import { asPerson } from "./helpers";
import { TOPTAL_URL } from "./servers";

const EMAIL = "hello@naidenko.dev";
const TOPTAL_HOST = "https://toptal.naidenko.dev";

/** Waits until React has hydrated the page's last section; its client-only parts settle right after. */
async function hydrated(page: Page, section = "contact") {
    await page.waitForFunction(id => {
        const element = document.querySelector(`section#${id}`);
        return element !== null && Object.keys(element).some(key => key.startsWith("__reactFiber$"));
    }, section);
    await page.waitForTimeout(300);
}

/** What the page sends to the site's own counter. */
function ownCounter(page: Page) {
    const hits: Record<string, unknown>[] = [];
    page.on("request", request => {
        if (request.method() === "POST" && new URL(request.url()).pathname === "/api/hit")
            hits.push(JSON.parse(request.postData() ?? "{}"));
    });
    return hits;
}

/** Every naidenko.dev in a text that is neither the Toptal host nor, on /privacy, the privacy note's address. */
function apexIn(text: string, privacyNote: boolean): string[] {
    return [...text.matchAll(/naidenko\.dev/g)]
        .map(({ index }) => text.slice(Math.max(0, index - 8), index + "naidenko.dev".length))
        .filter(found => !found.endsWith("toptal.naidenko.dev") && !(privacyNote && found === "privacy@naidenko.dev"));
}

/** A page of the Toptal build and the scripts it loads. */
async function withScripts(request: APIRequestContext, path: string): Promise<string[]> {
    const html = await (await request.get(`${TOPTAL_URL}${path}`)).text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
    expect(scripts.length, path).toBeGreaterThan(0);
    return [html, ...(await Promise.all(scripts.map(async src => (await request.get(new URL(src, TOPTAL_URL).href)).text())))];
}

test.describe("naidenko.dev", () => {
    test("the static pages carry no email address, and the home page no form", async ({ request }) => {
        for (const path of ["/", "/index.txt", "/audit", "/audit/sample", "/index.md", "/llms.txt"]) {
            const body = await (await request.get(path)).text();
            expect(body, path).not.toContain(EMAIL);
            // The sample report has a form of its own: its filters.
            if (!path.startsWith("/audit/sample")) expect(body, path).not.toMatch(/<form[\s>]/);
        }
    });

    test("a visit not tagged on Toptal sees the form, the email and the contact button", async ({ page }) => {
        await page.goto("/?ref=linkedin");
        await expect(page.locator("section#contact form")).toBeVisible();
        await expect(page.locator(`a[href="mailto:${EMAIL}"]`)).toHaveCount(2);
        await expect(page.locator("header").getByRole("link", { name: "Contact me" })).toBeVisible();
    });

    test("an old link tagged on Toptal moves to the Toptal host, with its path and query", async ({ request }) => {
        for (const path of ["/audit?ref=toptal-509168", "/?ref=toptal", "/audit/sample?utm_source=toptal&x=1"]) {
            const response = await request.get(path, { maxRedirects: 0 });
            expect(response.status(), path).toBe(302);
            expect(response.headers()["location"], path).toBe(`${TOPTAL_URL}${path}`);
        }
        expect((await request.get("/audit?ref=linkedin", { maxRedirects: 0 })).status()).toBe(200);
    });

    test("with the move turned off, a tagged visit still sees no form, no email and no contact button", async ({ page, request }) => {
        // As with TOPTAL_ORIGIN empty: the tagged address answers with the page itself.
        await page.route(
            url => url.search === "?ref=toptal-e2e",
            async route => route.fulfill({ response: await request.get("/") })
        );
        await page.goto("/?ref=toptal-e2e");
        await hydrated(page);
        await expect(page.locator("section#contact form")).toHaveCount(0);
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
        await expect(page.locator('header a[data-track="contact_click"]')).toBeHidden();
        await expect(page.locator("section#contact")).toContainText("Prefer to hire through Toptal?");
    });

    test("a visitor following an old Toptal link lands on the Toptal build, with no form or email", async ({ page }) => {
        await page.goto("/?ref=toptal-e2e");
        await expect(page).toHaveURL(`${TOPTAL_URL}/?ref=toptal-e2e`);
        await hydrated(page, "hire");
        await expect(page.locator("form")).toHaveCount(0);
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    });

    test("/privacy names its address as text, with no mailto link", async ({ page }) => {
        await page.goto("/privacy");
        await expect(page.locator("main")).toContainText("write to privacy@naidenko.dev.");
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
        await expect(page.locator("main")).not.toContainText(EMAIL);
        await expect(page.getByRole("heading", { name: "What the contact form collects" })).toBeVisible();
    });
});

test.describe("the Toptal build", () => {
    test.use({ baseURL: TOPTAL_URL });

    test("shows no form, no email and no icon row; Hire holds the badge", async ({ page }) => {
        await page.goto("/");
        await hydrated(page, "hire");
        await expect(page.locator("form")).toHaveCount(0);
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
        await expect(page.locator("section#contact")).toHaveCount(0);
        await expect(page.locator("header").getByRole("link", { name: "Contact me" })).toHaveCount(0);
        await expect(page.getByRole("list", { name: "Profiles and email" })).toHaveCount(0);
        await expect(page.locator('a[href*="linkedin.com"], a[href="https://github.com/anaidenko"]')).toHaveCount(0);
        await expect(page.locator("section#hire #r").getByRole("link", { name: "Hire me" })).toBeAttached();
        await expect(page.locator("section#hire")).toContainText("Hire me through Toptal");
    });

    test("keeps the Toptal line, the résumé link and the repositories", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("header").getByRole("link", { name: "Verified Expert in Engineering at Toptal" })).toBeVisible();
        await expect(page.getByRole("link", { name: /View full résumé on Toptal/ })).toBeAttached();
        await expect(page.locator("section#projects").getByRole("link", { name: "claude-video-digest" })).toHaveAttribute(
            "href",
            "https://github.com/anaidenko/claude-video-digest"
        );
    });

    test("its menu's Hire scrolls to the badge and lights up there", async ({ page, isMobile }) => {
        test.skip(isMobile, "The navigation is desktop-only");
        await page.goto("/");
        const nav = page.getByRole("navigation", { name: "In-page navigation" });
        await expect(nav.getByRole("link")).toHaveText(["About", "Experience", "Projects", "Code audit", "Services", "Hire"]);
        await nav.getByRole("link", { name: "Hire" }).click();
        await expect(page.locator("section#hire #r")).toBeInViewport();
        await expect(nav.getByRole("link", { name: "Hire" })).toHaveAttribute("aria-current", "true");
    });

    test("links nowhere on naidenko.dev and names no address, in its pages and their scripts", async ({ request }) => {
        for (const path of ["/", "/audit", "/audit/sample", "/privacy"])
            for (const text of await withScripts(request, path)) expect(apexIn(text, path === "/privacy"), path).toEqual([]);
        for (const path of ["/index.md", "/llms.txt", "/sitemap.xml", "/robots.txt", "/index.txt", "/audit/sample.txt"]) {
            const text = await (await request.get(path)).text();
            expect(apexIn(text, false), path).toEqual([]);
            expect(text, path).not.toContain("linkedin.com");
        }
        const pdf = (await (await request.get("/audit/sample-report.pdf")).body()).toString("latin1");
        expect(apexIn(pdf, false)).toEqual([]);
        expect(pdf).toContain(`/URI (${TOPTAL_HOST}/audit)`);
    });

    test("keeps every answer out of search engines, files included", async ({ page, request }) => {
        await page.goto("/");
        const script = await page.locator("script[src]").first().getAttribute("src");
        for (const path of ["/", "/audit", "/og.png", "/robots.txt", "/audit/sample-report.pdf", script!, "/stats", "/no-such-page"])
            expect((await request.get(path)).headers()["x-robots-tag"], path).toBe("noindex");
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
        expect((await request.get("/stats")).status()).toBe(404);
        expect((await request.post("/api/contact", { data: "{}" })).ok()).toBe(false);
    });

    test("keeps AI crawlers out in robots.txt and lets link previews in", async ({ request }) => {
        const body = await (await request.get("/robots.txt")).text();
        expect(body).toMatch(/User-Agent: GPTBot\n[\s\S]*?Disallow: \//);
        expect(body).toMatch(/User-Agent: \*\nContent-Signal: search=no, ai-input=no, ai-train=no\nAllow: \//);
        expect(body).not.toContain("Sitemap:");
    });

    test("describes its pages for link previews on its own host", async ({ page, request }) => {
        for (const [path, image] of [
            ["/", /^https:\/\/toptal\.naidenko\.dev\/og\.png\?v=[0-9a-f]{8}$/],
            ["/audit", /^https:\/\/toptal\.naidenko\.dev\/audit\/og\.png\?v=[0-9a-f]{8}$/]
        ] as const) {
            await page.goto(path);
            const address = path === "/" ? TOPTAL_HOST : `${TOPTAL_HOST}${path}`;
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", address);
            await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", address);
            const og = await page.locator('meta[property="og:image"]').getAttribute("content");
            expect(og, path).toMatch(image);
            const response = await request.get(new URL(og!).pathname);
            expect(response.status(), path).toBe(200);
            expect(response.headers()["content-type"], path).toBe("image/png");
        }
    });

    test("counts a visit under toptal-<job id>, and one without a tag under toptal", async ({ page }) => {
        await asPerson(page);
        await page.route("https://gc.zgo.at/**", route => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
        const hits = ownCounter(page);
        await page.goto("/audit?ref=509168");
        await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/audit", ref: "toptal-509168" }));
        await page.goto("/");
        await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/", ref: "toptal" }));
    });

    test("the audit page's home link keeps the job's tag, and so does a move within the site", async ({ page }) => {
        await page.goto("/audit?ref=509168");
        const home = page.getByRole("link", { name: "← Andrii Naidenko" });
        await expect(home).toHaveAttribute("href", "/?ref=509168");
        await expect(home).toHaveAttribute("rel", "nofollow");
        await home.click();
        await expect(page).toHaveURL(/\/\?ref=509168$/);
        await hydrated(page, "hire");
        await page.locator("section#projects").getByRole("link", { name: "Auditdesk" }).click();
        await expect(page).toHaveURL(/\/audit$/);
        await expect(page.getByRole("link", { name: "← Andrii Naidenko" })).toHaveAttribute("href", "/?ref=toptal-509168");
    });

    test("the sample report links the Toptal host, and its PDF is there", async ({ page, request }) => {
        await page.goto("/audit/sample");
        await expect(page.locator("main.doc").getByRole("link", { name: "toptal.naidenko.dev/audit" })).toHaveAttribute(
            "href",
            `${TOPTAL_HOST}/audit`
        );
        await expect(page.locator('main.doc a[href^="https://naidenko.dev"]')).toHaveCount(0);
        const pdf = await request.get("/audit/sample-report.pdf");
        expect(pdf.status()).toBe(200);
        expect(pdf.headers()["content-type"]).toBe("application/pdf");
    });

    test("its privacy note names its address as text and has no contact form to describe", async ({ page }) => {
        await page.goto("/privacy");
        await expect(page.locator("main")).toContainText("write to privacy@naidenko.dev.");
        await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "What the contact form collects" })).toHaveCount(0);
        await expect(page.locator("main")).not.toContainText(/Turnstile|Slack|Contact me/);
    });
});

test("both sites' menus scroll to the Auditdesk project with Code audit, and mark it", async ({ page, isMobile }) => {
    test.skip(isMobile, "The navigation is desktop-only");
    const transparent = "rgba(0, 0, 0, 0)";
    for (const site of ["/", `${TOPTAL_URL}/`]) {
        await page.goto(site);
        const nav = page.getByRole("navigation", { name: "In-page navigation" });
        const card = page.locator("li#auditdesk");
        const frame = card.locator("article > div[aria-hidden]");
        await expect(card, site).toContainText("Code audit · sample report");
        await expect(frame, site).toHaveCSS("border-left-color", transparent);

        await nav.getByRole("link", { name: "Code audit" }).click();
        await expect(card).toBeInViewport();
        await expect(nav.getByRole("link", { name: "Code audit" }), site).toHaveAttribute("aria-current", "true");
        const accent = await page.evaluate(() => {
            const probe = document.body.appendChild(document.createElement("div"));
            probe.className = "bg-accent";
            const color = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return color;
        });
        await expect(frame, site).toHaveCSS("border-left-color", accent);
        for (const other of await page.locator("section#projects li:not(#auditdesk) article > div[aria-hidden]").all())
            await expect(other, site).toHaveCSS("border-left-color", transparent);

        await nav.getByRole("link", { name: "Services" }).click();
        await expect(frame, site).toHaveCSS("border-left-color", transparent);
    }
});
