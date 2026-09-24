import { describe, expect, it } from "vitest";

import { ogImageVersion } from "./og";

describe("ogImageVersion", () => {
    it("is a short, stable hash of what the preview image shows", () => {
        expect(ogImageVersion()).toMatch(/^[0-9a-f]{8}$/);
        expect(ogImageVersion()).toBe(ogImageVersion());
    });
});
