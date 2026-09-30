import { describe, expect, it } from "vitest";

import { countryName, languageName } from "./names";

describe("countryName", () => {
    it("names a country by its code", () => {
        expect(countryName("KR")).toBe("South Korea");
        expect(countryName("US")).toBe("United States");
        expect(countryName("GR")).toBe("Greece");
    });

    it("names Cloudflare's special codes and keeps anything else as it came", () => {
        expect(countryName("")).toBe("Unknown");
        expect(countryName("XX")).toBe("Unknown");
        expect(countryName("T1")).toBe("Tor");
        expect(countryName("1")).toBe("1");
    });
});

describe("languageName", () => {
    it("names a language by its code", () => {
        expect(languageName("en")).toBe("English");
        expect(languageName("uk")).toBe("Ukrainian");
        expect(languageName("")).toBe("Unknown");
        expect(languageName("1")).toBe("1");
    });
});
