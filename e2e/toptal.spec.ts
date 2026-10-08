import { type Page, expect, test } from "@playwright/test";

const EMAIL = "hello@naidenko.dev";

/** Waits until React has hydrated the contact section; its client-only parts settle right after. */
async function hydrated(page: Page) {
    await page.waitForFunction(() => {
        const section = document.querySelector("section#contact");
        return section !== null && Object.keys(section).some(key => key.startsWith("__reactFiber$"));
    });
    await page.waitForTimeout(300);
}

test("the static pages carry no email address, and the home page no form", async ({ request }) => {
    for (const path of ["/", "/index.txt", "/audit", "/audit/sample", "/index.md", "/llms.txt"]) {
        const body = await (await request.get(path)).text();
        expect(body, path).not.toContain(EMAIL);
        // The sample report has a form of its own: its filters.
        if (!path.startsWith("/audit/sample")) expect(body, path).not.toMatch(/<form[\s>]/);
    }
});

test("a visit tagged on Toptal sees no form, no email and no contact button, and still the Toptal badge", async ({ page }) => {
    await page.goto("/?ref=toptal-e2e");
    await hydrated(page);
    await expect(page.locator("section#contact form")).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('header a[data-track="contact_click"]')).toHaveCount(1);
    await expect(page.locator('header a[data-track="contact_click"]')).toBeHidden();
    await expect(page.locator("section#contact #r").getByRole("link", { name: "Hire me" })).toBeAttached();
    await expect(page.locator("section#contact")).toContainText("Prefer to hire through Toptal?");
});

test("any other visit still sees the form, the email and the contact button", async ({ page }) => {
    await page.goto("/?ref=linkedin");
    await expect(page.locator("section#contact form")).toBeVisible();
    await expect(page.locator(`a[href="mailto:${EMAIL}"]`)).toHaveCount(2);
    await expect(page.locator("header").getByRole("link", { name: "Contact me" })).toBeVisible();
});

test("the audit page's home link keeps a Toptal tag, so the home page stays without the form", async ({ page }) => {
    await page.goto("/audit?ref=toptal-509168");
    const home = page.getByRole("link", { name: "← Andrii Naidenko" });
    await expect(home).toHaveAttribute("href", "/?ref=toptal-509168");
    await expect(home).toHaveAttribute("rel", "nofollow");
    await home.click();
    await expect(page).toHaveURL(/\/\?ref=toptal-509168$/);
    await hydrated(page);
    await expect(page.locator("section#contact form")).toHaveCount(0);
});

test("a visit through Toptal keeps its tag after a move within the site", async ({ page }) => {
    await page.goto("/?ref=toptal-e2e");
    await hydrated(page);
    await page.locator("section#projects").getByRole("link", { name: "Auditdesk" }).click();
    await expect(page).toHaveURL(/\/audit$/);
    await expect(page.getByRole("link", { name: "← Andrii Naidenko" })).toHaveAttribute("href", "/?ref=toptal-e2e");
});

test("the host made for Toptal's links shows no form or email, with no tag needed", async ({ page, baseURL }) => {
    // Chromium resolves any *.localhost name to this machine, where the test server listens.
    await page.goto(`http://toptal.localhost:${new URL(baseURL!).port}/`);
    await hydrated(page);
    await expect(page.locator("section#contact form")).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});
