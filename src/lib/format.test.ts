import { describe, expect, it } from "vitest";

import { compactFigure } from "./format";

describe("compactFigure", () => {
    it("shortens a store figure and keeps its plus sign", () => {
        expect(compactFigure("100,000+")).toBe("100K+");
        expect(compactFigure("1,000,000+")).toBe("1M+");
    });

    it("leaves a small figure as it is", () => {
        expect(compactFigure("731")).toBe("731");
    });
});
