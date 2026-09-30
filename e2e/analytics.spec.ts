import { type APIRequestContext, type Page, type Request, expect, test } from "@playwright/test";

import { asNewVisitor, asPerson } from "./helpers";

const GOATCOUNTER_URL = "https://e2e-test.goatcounter.invalid/count";
const STATS_PASSWORD = "test-password";
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const OWNER = { Authorization: `Basic ${Buffer.from(`andrii:${STATS_PASSWORD}`).toString("base64")}` };
/** In IGNORE_NETWORKS of .dev.vars.example. */
const IGNORED_ADDRESS = "203.0.113.5";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Serves a stand-in for GoatCounter's count.js that keeps what the page sends it. */
async function stubGoatCounter(page: Page) {
    let loads = 0;
    await page.route("https://gc.zgo.at/**", route => {
        loads += 1;
        return route.fulfill({
            status: 200,
            contentType: "text/javascript",
            body: "window.__counted = []; window.goatcounter = { count: function (vars) { window.__counted.push(vars.path); } };"
        });
    });
    await page.context().route("https://www.toptal.com/**", route => route.abort());
    return () => loads;
}

const goatcounterPaths = (page: Page) => page.evaluate(() => (window as unknown as { __counted?: string[] }).__counted ?? []);

/** What the page sends to the site's own counter. */
function ownCounter(page: Page) {
    const hits: Record<string, unknown>[] = [];
    page.on("request", (request: Request) => {
        if (request.method() === "POST" && new URL(request.url()).pathname === "/api/hit")
            hits.push(JSON.parse(request.postData() ?? "{}"));
    });
    return hits;
}

const randomAddress = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

/** Sends a hit the way the page does, from a browser at `address`. */
function sendHit(request: APIRequestContext, baseURL: string, hit: Record<string, unknown>, address = randomAddress()) {
    return request.post("/api/hit", {
        data: JSON.stringify(hit),
        headers: {
            "Content-Type": "text/plain",
            "User-Agent": BROWSER,
            "Origin": baseURL,
            "Accept-Language": "en-GB,en;q=0.8",
            "CF-Connecting-IP": address
        }
    });
}

/** The "Visitors" tile on /stats for a query. */
async function visitors(request: APIRequestContext, query: string) {
    const html = await (await request.get(`/stats${query}`, { headers: OWNER })).text();
    return { html, count: Number(/<b>(\d+)<\/b><span>Visitors</.exec(html)?.[1] ?? Number.NaN) };
}

test("counts a person's visit in both counters, with no cookies, storage or banner", async ({ page, context }) => {
    await asPerson(page);
    const loads = await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/?ref=e2e");
    await expect.poll(loads).toBe(1);
    await expect(page.locator(`script[data-goatcounter="${GOATCOUNTER_URL}"]`)).toBeAttached();
    await expect
        .poll(() => hits)
        .toContainEqual(expect.objectContaining({ kind: "view", path: "/", ref: "e2e", visit: expect.stringMatching(UUID) }));
    await expect(page.getByRole("region", { name: "Cookie consent" })).toHaveCount(0);
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("records the calls to action in both counters", async ({ page, isMobile }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Contact me" }).click();
    await expect.poll(() => goatcounterPaths(page)).toContain("contact_click");
    expect(hits).toContainEqual(expect.objectContaining({ kind: "event", name: "contact_click", detail: "" }));
    const popup = page.context().waitForEvent("page");
    await page.locator("#r").getByRole("link", { name: "Hire me" }).click();
    await (await popup).close();
    await expect.poll(() => goatcounterPaths(page)).toContain("hire_me_toptal-badge");
    expect(hits).toContainEqual(expect.objectContaining({ kind: "event", name: "hire_me_toptal", detail: "badge" }));
    test.skip(isMobile, "The copy button is checked on desktop");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy install commands" }).click();
    await expect.poll(() => goatcounterPaths(page)).toContain("copy_install");
});

test("records a sent message as a lead", async ({ page }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await asNewVisitor(page);
    await page.goto("/#contact");
    const form = page.locator("section#contact form");
    await form.getByLabel("Name").fill("Ada Lovelace");
    await form.getByLabel("Email").fill("ada@example.com");
    await form.getByLabel("Message").fill("An iOS and Android app for our field crews.");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("section#contact").getByRole("status")).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => goatcounterPaths(page)).toContain("generate_lead-contact");
    expect(hits).toContainEqual(expect.objectContaining({ kind: "event", name: "generate_lead", detail: "contact" }));
});

test("records the sections read, a menu click and the visible time", async ({ page, isMobile }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/");
    await page.locator("section#contact").scrollIntoViewIfNeeded();
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "event", name: "section_view", detail: "contact" }));
    if (!isMobile) {
        await page.getByRole("navigation", { name: "In-page navigation" }).getByRole("link", { name: "Projects" }).click();
        await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "event", name: "nav_click", detail: "projects" }));
    }
    await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "time", seconds: expect.any(Number) }));
});

test("counts nothing from an automated browser, or with ?preview=1", async ({ page }) => {
    const loads = await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/");
    await asPerson(page);
    await page.goto("/?preview=1");
    await page.getByRole("link", { name: "Contact me" }).click();
    await page.waitForTimeout(1000);
    expect(hits).toEqual([]);
    expect(loads()).toBe(0);
});

test("stops counting the owner's browser once it opens /stats, until the owner undoes it", async ({ page }) => {
    await asPerson(page);
    const loads = await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.setExtraHTTPHeaders(OWNER);
    await page.goto("/stats");
    await expect(page.locator("#owner")).toContainText("This browser is not counted");
    expect(await page.evaluate(() => localStorage.getItem("skipgc"))).toBe("t");
    await page.goto("/");
    await page.waitForTimeout(1000);
    expect(hits).toEqual([]);
    expect(loads()).toBe(0);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Count it again" }).click();
    await expect(page.locator("#owner")).toContainText("This browser is counted");
    await page.goto("/");
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view" }));
});

test("keeps visits in the database and shows them only with the password", async ({ request, baseURL }) => {
    const anonymous = await request.get("/stats");
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["www-authenticate"]).toContain("Basic");

    const ref = `e2e-${Date.now()}`;
    const visit = crypto.randomUUID();
    const view = { kind: "view", visit, path: "/", referrer: "https://www.linkedin.com", ref, screen: 1440 };
    expect((await sendHit(request, baseURL!, view)).status()).toBe(204);
    expect((await sendHit(request, baseURL!, { kind: "event", visit, name: "section_view", detail: "experience" })).status()).toBe(204);
    expect((await sendHit(request, baseURL!, { kind: "time", visit, seconds: 95 })).status()).toBe(204);

    const owner = await request.get(`/stats?range=all&ref=${ref}`, { headers: OWNER });
    expect(owner.status()).toBe(200);
    expect(owner.headers()["x-robots-tag"]).toBe("noindex");
    const html = await owner.text();
    expect((await visitors(request, `?range=all&ref=${ref}`)).count).toBe(1);
    for (const part of ["linkedin.com", "1 min 35 s", "English", "1024–1919 px (laptops)", `?ref=${ref}`]) expect(html).toContain(part);
});

test("counts neither an ignored network nor a click without its visit", async ({ request, baseURL }) => {
    const ref = `e2e-ignored-${Date.now()}`;
    const visit = crypto.randomUUID();
    expect(
        (await sendHit(request, baseURL!, { kind: "view", visit, path: "/", referrer: "", ref, screen: 390 }, IGNORED_ADDRESS)).status()
    ).toBe(204);
    expect((await visitors(request, `?range=all&ref=${ref}`)).count).toBe(0);

    const probe = `orphan_${Date.now()}`;
    expect((await sendHit(request, baseURL!, { kind: "event", visit: crypto.randomUUID(), name: probe, detail: "" })).status()).toBe(204);
    expect((await visitors(request, "?range=all")).html).not.toContain(probe);
});

test("drops hits over the limit without an error in the visitor's console", async ({ page }) => {
    await asPerson(page);
    const errors: string[] = [];
    page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
    });
    const address = randomAddress();
    await page.route("**/api/hit", route => route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": address } }));
    await page.goto("/");
    await page.evaluate(async () => {
        for (let i = 0; i < 61; i++)
            await fetch("/api/hit", {
                method: "POST",
                body: JSON.stringify({ kind: "event", visit: crypto.randomUUID(), name: "limit_probe" })
            });
    });
    await page.reload();
    await page.getByRole("link", { name: "Contact me" }).click();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
});
