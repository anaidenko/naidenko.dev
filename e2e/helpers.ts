import type { Page } from "@playwright/test";

/**
 * Gives this page's contact requests their own visitor address. wrangler dev keys the send limit
 * by CF-Connecting-IP like production, so tests sharing 127.0.0.1 would use up one another's
 * limit. (In production Cloudflare overwrites the header, so a visitor cannot set it.)
 */
export async function asNewVisitor(page: Page) {
    const address = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
    await page.route("**/api/contact", route => route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": address } }));
    return address;
}

/**
 * Makes the test browser count as a person. Playwright sets navigator.webdriver, and both counters
 * skip automated browsers, so without this no visit is counted.
 */
export async function asPerson(page: Page) {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
}
