import { type Page, expect, test } from "@playwright/test";

import { asNewVisitor } from "./helpers";

async function fillValid(page: Page) {
    const form = page.locator("section#contact form");
    await form.getByLabel("Name").fill("Ada Lovelace");
    await form.getByLabel("Email").fill("ada@example.com");
    await form.getByLabel(/Company or website/).fill("Analytical Engines");
    await form.getByLabel("What are you building?").fill("An iOS and Android app for our field crews.");
}

test("validates before sending", async ({ page }) => {
    let posts = 0;
    page.on("request", request => {
        if (request.url().endsWith("/api/contact")) posts += 1;
    });
    await page.goto("/#contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Please enter your name.")).toBeVisible();
    await expect(page.getByText("Please enter your email.")).toBeVisible();
    await expect(page.getByText("Please tell me what you’re building.")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeFocused();
    expect(posts).toBe(0);
});

test("sends a valid message", async ({ page }) => {
    await asNewVisitor(page);
    await page.goto("/#contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("section#contact").getByRole("status")).toContainText("I’ll reply to ada@example.com", { timeout: 30_000 });
});

test("sends once on a double click", async ({ page }) => {
    let posts = 0;
    page.on("request", request => {
        if (request.url().endsWith("/api/contact") && request.method() === "POST") posts += 1;
    });
    await asNewVisitor(page);
    await page.goto("/#contact");
    await fillValid(page);
    await page.evaluate(() => {
        const button = document.querySelector<HTMLButtonElement>('section#contact button[type="submit"]');
        button?.click();
        button?.click();
    });
    await expect(page.locator("section#contact").getByRole("status")).toBeVisible({ timeout: 30_000 });
    expect(posts).toBe(1);
});

test("falls back to email when Turnstile is blocked", async ({ page }) => {
    await page.route("https://challenges.cloudflare.com/**", route => route.abort());
    await page.goto("/#contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    const alert = page.locator("section#contact").getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(alert.getByRole("link", { name: "hello@naidenko.dev" })).toHaveAttribute("href", "mailto:hello@naidenko.dev");
});

test("shows the Toptal badge with its referral link", async ({ page }) => {
    await page.goto("/#contact");
    const badge = page.locator("section#contact #r");
    await expect(badge).toBeVisible();
    await expect(badge.getByRole("link", { name: "Hire me" })).toHaveAttribute(
        "href",
        "https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7"
    );
});

test("links the privacy note from the form and the footer", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "Privacy" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    await expect(page.getByText("Adobe Fonts")).toBeVisible();
    await page.goto("/#contact");
    await expect(page.locator("section#contact").getByRole("link", { name: "Privacy note" })).toHaveAttribute("href", "/privacy");
});

test("answers unknown paths with the 404 page", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("doesn’t exist");
});

test("hides the form without JavaScript, so a message can never leak into a URL", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/#contact");
    await expect(page.locator("section#contact form")).toBeHidden();
    await expect(page.locator("section#contact").getByRole("link", { name: "hello@naidenko.dev" })).toBeVisible();
    // Chrome's script-disabled emulation keeps the parser's scripting flag on, so <noscript> content
    // is not rendered here; check that the page ships the note instead.
    const html = await (await page.request.get("/")).text();
    expect(html).toMatch(/<noscript>[^<]*<p[^>]*>The form needs JavaScript/);
    await context.close();
});

test("explains the send limit and offers email instead", async ({ page }) => {
    await page.route("**/api/contact", route =>
        route.fulfill({ status: 429, headers: { "Retry-After": "60" }, json: { ok: false, error: "rate-limit" } })
    );
    await page.goto("/#contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    const alert = page.locator("section#contact").getByRole("alert");
    await expect(alert).toContainText("a minute", { timeout: 30_000 });
    await expect(alert.getByRole("link", { name: "hello@naidenko.dev" })).toHaveAttribute("href", "mailto:hello@naidenko.dev");
});

test("stops the fourth send from one address within a minute", async ({ request }) => {
    const headers = { "Content-Type": "application/json", "CF-Connecting-IP": `203.0.113.${Math.floor(Math.random() * 250) + 1}` };
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) statuses.push((await request.post("/api/contact", { headers, data: {} })).status());
    expect(statuses).toEqual([422, 422, 422, 429]);
});
