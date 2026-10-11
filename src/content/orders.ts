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

const isOrder = (id: string): id is OrderId => Object.hasOwn(orders, id);

/** The message an order link starts the contact form with, or null for no order or an unknown one. */
export function orderMessage(id: string | null): string | null {
    if (!id || !isOrder(id)) return null;
    const what = id === "custom" ? "a quote for a code audit" : `the ${orders[id]} package`;
    return `I’d like ${what}. The repository, or a few lines about the product: `;
}
