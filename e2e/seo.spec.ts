import { expect, test } from "@playwright/test";

const SITE = "https://naidenko.dev";

test("serves robots.txt that allows crawling and points at the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/Allow: \//);
    expect(body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
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
