import { expect, test } from "@playwright/test";

const SITE = "https://naidenko.dev";

test("serves robots.txt that allows crawling and points at the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/Allow: \//);
    expect(body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(body).toMatch(/^Content-Signal: search=yes, ai-input=yes, ai-train=yes$/m);
});

test("serves llms.txt and the whole page as Markdown", async ({ request }) => {
    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    expect(llms.headers()["content-type"]).toContain("text/plain");
    expect(await llms.text()).toMatch(/^# Andrii Naidenko\n\n> /);
    const markdown = await request.get("/index.md");
    expect(markdown.status()).toBe(200);
    expect(await markdown.text()).toContain("## Experience");
});

test("answers an agent's Accept: text/markdown on the home page, and browsers with HTML", async ({ request }) => {
    const agent = await request.get("/", { headers: { Accept: "text/markdown" } });
    expect(agent.status()).toBe(200);
    expect(agent.headers()["content-type"]).toBe("text/markdown; charset=utf-8");
    expect(agent.headers()["vary"]).toContain("Accept");
    expect(Number(agent.headers()["x-markdown-tokens"])).toBeGreaterThan(100);
    expect(await agent.text()).toMatch(/^# Andrii Naidenko\n/);

    const browser = await request.get("/", { headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" } });
    expect(browser.headers()["content-type"]).toContain("text/html");
    expect(browser.headers()["link"]).toContain('</index.md>; rel="alternate"; type="text/markdown"');
    expect(browser.headers()["link"]).toContain('</llms.txt>; rel="describedby"');
    expect(browser.headers()["x-frame-options"]).toBe("DENY");
    expect(browser.headers()["x-content-type-options"]).toBe("nosniff");
});

test("serves a sitemap with the home page and the privacy note", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain(`<loc>${SITE}</loc>`);
    expect(body).toContain(`<loc>${SITE}/privacy</loc>`);
});

test("describes the page for search engines and link previews", async ({ page, request }) => {
    await page.goto("/");
    const meta = (selector: string) => page.locator(selector).first().getAttribute("content");
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(SITE);
    expect(await meta('meta[name="description"]')).toContain("Full-stack and mobile developer");
    expect(await meta('meta[property="og:title"]')).toContain("Andrii Naidenko");
    expect(await meta('meta[property="og:url"]')).toBe(SITE);
    expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    const image = await meta('meta[property="og:image"]');
    expect(image).toMatch(new RegExp(`^${SITE}/`));
    expect(await meta('meta[property="og:image:width"]')).toBe("1200");
    expect(await meta('meta[property="og:image:height"]')).toBe("630");
    const imageResponse = await request.get(new URL(image!).pathname);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toBe("image/png");
});

test("publishes structured data about the person", async ({ page }) => {
    await page.goto("/");
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    const person = (graph["@graph"] ?? [graph]).find((node: { "@type": string }) => node["@type"] === "Person");
    expect(person).toMatchObject({ name: "Andrii Naidenko", url: SITE, jobTitle: "Full-stack and Mobile Developer" });
    expect(person.image).toMatch(new RegExp(`^${SITE}/`));
    const profile = graph["@graph"].find((node: { "@type": string }) => node["@type"] === "ProfilePage");
    expect(profile).toMatchObject({ url: SITE, mainEntity: { "@id": person["@id"] } });
    expect(await page.locator('link[rel="alternate"][type="text/markdown"]').getAttribute("href")).toBe(`${SITE}/index.md`);
});

test("offers an icon for iOS home screens", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
});

test("links the favicon", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/svg+xml");
});
