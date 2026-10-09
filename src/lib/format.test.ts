import { describe, expect, it } from "vitest";

import { compactFigure, quoteParagraphs } from "./format";

describe("compactFigure", () => {
    it("shortens a store figure and keeps its plus sign", () => {
        expect(compactFigure("100,000+")).toBe("100K+");
        expect(compactFigure("1,000,000+")).toBe("1M+");
    });

    it("leaves a small figure as it is", () => {
        expect(compactFigure("731")).toBe("731");
    });
});

describe("quoteParagraphs", () => {
    it("opens the quote on the first paragraph and closes it on the last", () => {
        expect(quoteParagraphs("One.\n\nTwo.\n\nThree.")).toEqual(["“One.", "Two.", "Three.”"]);
    });

    it("quotes a single paragraph whole", () => {
        expect(quoteParagraphs("Only.")).toEqual(["“Only.”"]);
    });
});
