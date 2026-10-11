import { describe, expect, it } from "vitest";

import { orderMessage, orderOf } from "./orders";

describe("orders", () => {
    it("knows a package by its id and nothing else", () => {
        expect(orderOf("full")).toBe("full");
        for (const id of ["", "Full", "__proto__", "constructor", null, 1]) expect(orderOf(id)).toBeNull();
    });

    it("starts the message with the package", () => {
        expect(orderMessage("diligence")).toBe("I’d like the Due diligence package. The repository, or a few lines about the product: ");
        expect(orderMessage("custom")).toBe("I’d like a quote for a code audit. The repository, or a few lines about the product: ");
        expect(orderMessage("nothing")).toBeNull();
    });
});
