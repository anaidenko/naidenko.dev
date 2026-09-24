import { type Page, type Request, expect, test } from "@playwright/test";

import { asNewVisitor } from "./helpers";

const GOATCOUNTER_URL = "https://e2e-test.goatcounter.invalid/count";
const STATS_PASSWORD = "test-password";
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

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
    const hits: { kind: string; name: string; detail?: string }[] = [];
    page.on("request", (request: Request) => {
        if (request.method() === "POST" && new URL(request.url()).pathname === "/api/hit")
            hits.push(JSON.parse(request.postData() ?? "{}"));
    });
    return hits;
}

test("counts the visit in both counters, with no cookies, storage or banner", async ({ page, context }) => {
    const loads = await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/");
    await expect.poll(loads).toBe(1);
    await expect(page.locator(`script[data-goatcounter="${GOATCOUNTER_URL}"]`)).toBeAttached();
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", name: "/" }));
    await expect(page.getByRole("region", { name: "Cookie consent" })).toHaveCount(0);
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("records the calls to action in both counters", async ({ page, isMobile }) => {
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Contact me" }).click();
    await expect.poll(() => goatcounterPaths(page)).toContain("contact_click");
    expect(hits).toContainEqual({ kind: "event", name: "contact_click", detail: "" });
    const popup = page.context().waitForEvent("page");
    await page.locator("#r").getByRole("link", { name: "Hire me" }).click();
    await (await popup).close();
    await expect.poll(() => goatcounterPaths(page)).toContain("hire_me_toptal-badge");
    expect(hits).toContainEqual({ kind: "event", name: "hire_me_toptal", detail: "badge" });
    test.skip(isMobile, "The copy button is checked on desktop");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy install commands" }).click();
    await expect.poll(() => goatcounterPaths(page)).toContain("copy_install");
});

test("records a sent message as a lead", async ({ page }) => {
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
    expect(hits).toContainEqual({ kind: "event", name: "generate_lead", detail: "contact" });
});

const OWNER = { Authorization: `Basic ${Buffer.from(`andrii:${STATS_PASSWORD}`).toString("base64")}` };

/** The "Page views, all time" tile on /stats. */
function allTimeViews(html: string): number {
    return Number(/<b>(\d+)<\/b><span>Page views, all time/.exec(html)?.[1] ?? Number.NaN);
}

test("keeps the counts in the database and shows them only with the password", async ({ request, baseURL }) => {
    const anonymous = await request.get("/stats");
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["www-authenticate"]).toContain("Basic");

    const before = allTimeViews(await (await request.get("/stats", { headers: OWNER })).text());
    const sent = await request.post("/api/hit", {
        data: JSON.stringify({ kind: "view", name: "/", referrer: "https://www.linkedin.com/feed/" }),
        headers: {
            "Content-Type": "text/plain",
            "User-Agent": BROWSER,
            "Origin": baseURL!,
            "CF-Connecting-IP": `198.51.100.${Math.floor(Math.random() * 250) + 1}`
        }
    });
    expect(sent.status()).toBe(204);

    const owner = await request.get("/stats", { headers: OWNER });
    expect(owner.status()).toBe(200);
    expect(owner.headers()["x-robots-tag"]).toBe("noindex");
    const html = await owner.text();
    expect(allTimeViews(html)).toBeGreaterThan(before);
    expect(html).toContain("linkedin.com");
});

test("drops hits over the limit without an error in the visitor's console", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
    });
    const address = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
    await page.route("**/api/hit", route => route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": address } }));
    await page.goto("/");
    await page.evaluate(async () => {
        for (let i = 0; i < 61; i++)
            await fetch("/api/hit", { method: "POST", body: JSON.stringify({ kind: "event", name: "limit_probe" }) });
    });
    await page.reload();
    await page.getByRole("link", { name: "Contact me" }).click();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
});
