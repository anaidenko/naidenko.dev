/**
 * The packages an order link from /audit's prices names (`/?order=<id>#contact`). The contact form
 * imports this, so it carries no price: the prices stay in `pricing.ts`, which only the server
 * renders, and only on naidenko.dev.
 */
export const orders = {
    launch: "Launch check",
    full: "Full audit",
    diligence: "Due diligence",
    custom: "Custom audit"
} as const;

export type OrderId = keyof typeof orders;

/** A package's id from a link or a form, or null for anything else. */
export const orderOf = (id: unknown): OrderId | null => (typeof id === "string" && Object.hasOwn(orders, id) ? (id as OrderId) : null);

/** The message an order link starts the contact form with, or null for no order or an unknown one. */
export function orderMessage(raw: string | null): string | null {
    const id = orderOf(raw);
    if (!id) return null;
    const what = id === "custom" ? "a quote for a code audit" : `the ${orders[id]} package`;
    return `I’d like ${what}. The repository, or a few lines about the product: `;
}
