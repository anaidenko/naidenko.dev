import { describe, expect, it } from "vitest";

import { pricing } from "./pricing";

const dollars = (price: string) => Number(price.replace(/[$,]/g, ""));

describe("pricing", () => {
    it("takes the launch offer's percent off every package, rounded down to the dollar", () => {
        const { promo } = pricing;
        if (!promo) return;
        for (const item of pricing.packages)
            expect(dollars(item.promoPrice), item.id).toBe(Math.floor((dollars(item.price) * (100 - promo.percent)) / 100));
        expect(promo.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(promo.text).toContain(`${promo.percent}%`);
    });
});
