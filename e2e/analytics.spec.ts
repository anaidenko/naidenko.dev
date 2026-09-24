import { type Page, expect, test } from "@playwright/test";

import { asNewVisitor } from "./helpers";

// A first visit: no stored choice (the other specs start with analytics declined).
test.use({ storageState: { cookies: [], origins: [] } });

const MEASUREMENT_ID = "G-TEST000000";

/** Serves an empty gtag.js and counts the loads, so no test talks to Google. */
async function stubGoogle(page: Page) {
    let loads = 0;
    await page.route("https://www.googletagmanager.com/**", route => {
        loads += 1;
        return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    });
    await page.context().route("https://www.toptal.com/**", route => route.abort());
    return () => loads;
}

function dataLayer(page: Page) {
    return page.evaluate(() => (window.dataLayer ?? []).map(entry => Array.from(entry as ArrayLike<unknown>)));
}

async function sentEvent(page: Page, name: string) {
    return (await dataLayer(page)).some(entry => entry[0] === "event" && entry[1] === name);
}

const banner = (page: Page) => page.getByRole("region", { name: "Cookie consent" });

test("asks before loading Google Analytics", async ({ page }) => {
    const loads = await stubGoogle(page);
    await page.goto("/");
    await expect(banner(page)).toBeVisible();
    expect(loads()).toBe(0);
});

test("remembers a refusal and never loads Google Analytics", async ({ page }) => {
    const loads = await stubGoogle(page);
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Decline" }).click();
    await expect(banner(page)).toBeHidden();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(banner(page)).toBeHidden();
    expect(loads()).toBe(0);
});

test("loads Google Analytics after consent, with ads storage denied", async ({ page }) => {
    const loads = await stubGoogle(page);
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Allow" }).click();
    await expect(banner(page)).toBeHidden();
    await expect.poll(loads).toBeGreaterThan(0);
    const layer = await dataLayer(page);
    expect(layer).toContainEqual(["consent", "default", expect.objectContaining({ ad_storage: "denied", analytics_storage: "denied" })]);
    expect(layer).toContainEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(layer).toContainEqual(["config", MEASUREMENT_ID]);
});

test("records the calls to action", async ({ page, isMobile }) => {
    await stubGoogle(page);
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Allow" }).click();
    await page.getByRole("link", { name: "Start a project" }).click();
    await expect.poll(() => sentEvent(page, "start_project")).toBe(true);
    const popup = page.context().waitForEvent("page");
    await page.locator("#r").getByRole("link", { name: "Hire me" }).click();
    await (await popup).close();
    await expect.poll(() => sentEvent(page, "hire_me_toptal")).toBe(true);
    test.skip(isMobile, "The copy button is checked on desktop");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy install commands" }).click();
    await expect.poll(() => sentEvent(page, "copy_install")).toBe(true);
});

test("records a sent message as a lead", async ({ page }) => {
    await stubGoogle(page);
    await asNewVisitor(page);
    await page.goto("/#contact");
    await banner(page).getByRole("button", { name: "Allow" }).click();
    const form = page.locator("section#contact form");
    await form.getByLabel("Name").fill("Ada Lovelace");
    await form.getByLabel("Email").fill("ada@example.com");
    await form.getByLabel("What are you building?").fill("An iOS and Android app for our field crews.");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("section#contact").getByRole("status")).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => sentEvent(page, "generate_lead")).toBe(true);
});

test("lets the visitor change their mind from the footer", async ({ page }) => {
    await stubGoogle(page);
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Decline" }).click();
    await page.locator("footer").getByRole("button", { name: "Cookie settings" }).click();
    await expect(banner(page)).toBeVisible();
});
