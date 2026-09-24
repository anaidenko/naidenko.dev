import { describe, expect, it } from "vitest";

import { detailOf, goatcounterPath } from "./analytics";

describe("detailOf", () => {
    it("joins the parameters' values in order", () => {
        expect(detailOf({ placement: "badge" })).toBe("badge");
        expect(detailOf({ form: "contact", reason: "rate_limit" })).toBe("contact-rate_limit");
        expect(detailOf({})).toBe("");
    });

    it("keeps only characters the counter accepts, and at most 64 of them", () => {
        expect(detailOf({ project: "a b/c<d>" })).toBe("a_b_c_d_");
        expect(detailOf({ long: "x".repeat(100) })).toHaveLength(64);
    });
});

describe("goatcounterPath", () => {
    it("names an event after itself and its detail, never with a leading slash", () => {
        expect(goatcounterPath("hire_me_toptal", "badge")).toBe("hire_me_toptal-badge");
        expect(goatcounterPath("contact_click", "")).toBe("contact_click");
    });
});
