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

/** A link tag no other run or project uses: the desktop and mobile projects run at the same time. */
const uniqueRef = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** The part of a page between two headings. */
const between = (html: string, from: string, to: string) => html.slice(html.indexOf(from), html.indexOf(to));

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

test("counts the owner's browser from an ignored network once it chose to be counted", async ({ page, request }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    await page.route("**/api/hit", route =>
        route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": IGNORED_ADDRESS } })
    );
    const ref = uniqueRef();
    await page.goto(`/?ref=${ref}`);
    await page.waitForTimeout(1000);
    expect((await visitors(request, `?range=all&ref=${ref}`)).count).toBe(0);

    await page.setExtraHTTPHeaders(OWNER);
    await page.goto("/stats");
    await page.getByRole("button", { name: "Count it again" }).click();
    await expect(page.locator("#owner")).toContainText("even from an ignored network");
    await page.goto(`/?ref=${ref}`);
    await expect.poll(async () => (await visitors(request, `?range=all&ref=${ref}`)).count).toBe(1);
});

test("keeps visits in the database and shows them only with the password", async ({ request, baseURL }) => {
    const anonymous = await request.get("/stats");
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["www-authenticate"]).toContain("Basic");

    // Random as well as timed: the desktop and mobile projects run this test at the same moment.
    const ref = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const visit = crypto.randomUUID();
    const address = randomAddress();
    // The same person came earlier that day without the tag; the tagged visit still counts them.
    const untagged = { kind: "view", visit: crypto.randomUUID(), path: "/", referrer: "", ref: "", screen: 1440 };
    expect((await sendHit(request, baseURL!, untagged, address)).status()).toBe(204);
    const view = { kind: "view", visit, path: "/", referrer: "https://www.linkedin.com", ref, screen: 1440 };
    expect((await sendHit(request, baseURL!, view, address)).status()).toBe(204);
    expect((await sendHit(request, baseURL!, { kind: "event", visit, name: "section_view", detail: "experience" }, address)).status()).toBe(
        204
    );
    expect((await sendHit(request, baseURL!, { kind: "time", visit, seconds: 95 }, address)).status()).toBe(204);

    const owner = await request.get(`/stats?range=all&ref=${ref}`, { headers: OWNER });
    expect(owner.status()).toBe(200);
    expect(owner.headers()["x-robots-tag"]).toBe("noindex");
    const html = await owner.text();
    expect((await visitors(request, `?range=all&ref=${ref}`)).count).toBe(1);
    for (const part of ["linkedin.com", "1 min 35 s", "English", "1024–1919 px (laptops)", `?ref=${ref}`]) expect(html).toContain(part);
});

test("counts nothing from an ignored network", async ({ request, baseURL }) => {
    const ref = uniqueRef();
    const visit = crypto.randomUUID();
    expect(
        (await sendHit(request, baseURL!, { kind: "view", visit, path: "/", referrer: "", ref, screen: 390 }, IGNORED_ADDRESS)).status()
    ).toBe(204);
    expect((await visitors(request, `?range=all&ref=${ref}`)).count).toBe(0);
});

test("keeps a section that reaches the counter before its visit does", async ({ request, baseURL }) => {
    const ref = uniqueRef();
    const visit = crypto.randomUUID();
    const address = randomAddress();
    expect((await sendHit(request, baseURL!, { kind: "event", visit, name: "section_view", detail: "services" }, address)).status()).toBe(
        204
    );
    expect((await sendHit(request, baseURL!, { kind: "view", visit, path: "/", referrer: "", ref, screen: 1440 }, address)).status()).toBe(
        204
    );
    const { html } = await visitors(request, `?range=all&ref=${ref}`);
    expect(between(html, "Sections reached", "Menu clicks")).toContain("Services");
});

test("counts a visit that leaves within 10 seconds as a bounce, whatever it clicked or saw", async ({ request, baseURL }) => {
    const ref = uniqueRef();
    const visit = crypto.randomUUID();
    const address = randomAddress();
    expect((await sendHit(request, baseURL!, { kind: "view", visit, path: "/", referrer: "", ref, screen: 2560 }, address)).status()).toBe(
        204
    );
    for (const detail of ["about", "experience"])
        expect((await sendHit(request, baseURL!, { kind: "event", visit, name: "section_view", detail }, address)).status()).toBe(204);
    expect((await sendHit(request, baseURL!, { kind: "event", visit, name: "contact_click", detail: "" }, address)).status()).toBe(204);
    expect((await sendHit(request, baseURL!, { kind: "time", visit, seconds: 5 }, address)).status()).toBe(204);
    const { html } = await visitors(request, `?range=all&ref=${ref}`);
    expect(/<b>([^<]+)<\/b><span>Bounce rate/.exec(html)?.[1]).toBe("100%");
});

test("counts a move to another page as a new visit, and ends the first one with its time", async ({ page }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/?ref=e2e", { referer: "https://www.linkedin.com/" });
    await expect
        .poll(() => hits)
        .toContainEqual(expect.objectContaining({ kind: "view", path: "/", ref: "e2e", referrer: "https://www.linkedin.com" }));
    await page.locator("footer").getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/privacy", ref: "", referrer: "" }));
    const [home, privacy] = hits.filter(hit => hit.kind === "view");
    expect(privacy.visit).not.toBe(home.visit);
    expect(hits).toContainEqual(expect.objectContaining({ kind: "time", visit: home.visit }));
    await expect.poll(() => goatcounterPaths(page)).toContain("/privacy");
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

test("filters every Toptal link at once with toptal*", async ({ request, baseURL }) => {
    const before = (await visitors(request, "?range=all&ref=toptal*")).count;
    const ref = `toptal-${uniqueRef()}`;
    await sendHit(request, baseURL!, { kind: "view", visit: crypto.randomUUID(), path: "/audit", referrer: "", ref, screen: 1440 });
    await expect.poll(async () => (await visitors(request, "?range=all&ref=toptal*")).count).toBeGreaterThan(before);
    expect((await visitors(request, `?range=all&ref=${ref}`)).count).toBe(1);
});

test("counts a visit GitHub sent without a tag under the tag github", async ({ page }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/", { referer: "https://github.com/" });
    await expect
        .poll(() => hits)
        .toContainEqual(expect.objectContaining({ kind: "view", path: "/", ref: "github", referrer: "https://github.com" }));
});

test("counts the sample report's visit with its tag, and the move to the audit page with the same tag", async ({ page }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/audit/sample?ref=e2e-check");
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/audit/sample", ref: "e2e-check" }));
    await page.getByRole("link", { name: "How the audit works" }).click();
    await expect(page).toHaveURL(/\/audit\?ref=e2e-check$/);
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/audit", ref: "e2e-check" }));
    expect(hits).toContainEqual(expect.objectContaining({ kind: "event", name: "sample_to_audit" }));
});

test("records the audit hero's sample click, and the sample report's PDF", async ({ page }) => {
    await asPerson(page);
    await stubGoatCounter(page);
    const hits = ownCounter(page);
    await page.goto("/audit");
    // The click handler is set when the page has hydrated, which its view hit shows.
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/audit" }));
    await page.locator("main header").getByRole("link", { name: "See a sample report" }).click();
    await expect(page).toHaveURL(/\/audit\/sample$/);
    expect(hits).toContainEqual(expect.objectContaining({ kind: "event", name: "sample_report_click", detail: "hero" }));
    // The click handler is set when the page has hydrated, which its view hit shows.
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "view", path: "/audit/sample" }));
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PDF" }).click();
    await download;
    await expect.poll(() => hits).toContainEqual(expect.objectContaining({ kind: "event", name: "sample_pdf" }));
});

test("keeps each page's sections apart in /stats: the home page's reach, and how far the sample report was read", async ({
    request,
    baseURL
}) => {
    const ref = uniqueRef();
    const address = randomAddress();
    const home = crypto.randomUUID();
    const sample = crypto.randomUUID();
    const hit = (body: Record<string, unknown>) => sendHit(request, baseURL!, body, address);
    expect((await hit({ kind: "view", visit: home, path: "/", referrer: "", ref, screen: 1440 })).status()).toBe(204);
    expect((await hit({ kind: "event", visit: home, name: "section_view", detail: "about" })).status()).toBe(204);
    expect((await hit({ kind: "view", visit: sample, path: "/audit/sample", referrer: "", ref, screen: 1440 })).status()).toBe(204);
    for (const detail of ["summary", "findings"])
        expect((await hit({ kind: "event", visit: sample, name: "section_view", detail })).status()).toBe(204);
    const { html } = await visitors(request, `?range=all&ref=${ref}`);
    const reached = between(html, "Sections reached", "Sample report read");
    expect(reached).toContain("About");
    expect(reached).not.toContain("summary");
    const read = between(html, "Sample report read", "Menu clicks");
    expect(read).toContain("Summary");
    expect(read).toContain("1 · 100%");
});
