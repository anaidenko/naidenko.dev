import { describe, expect, it } from "vitest";

import { createVisibleClock, detailOf, goatcounterPath, isExcluded, originOf, refOf } from "./analytics";

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

/** The parts of a window the exclusion checks read, as a person's browser has them. */
function browserWindow(overrides: Record<string, unknown> = {}, document: Record<string, unknown> = {}): Window {
    const self = {};
    return {
        location: { search: "" },
        localStorage: { getItem: () => null },
        navigator: { webdriver: false },
        document: { visibilityState: "visible", ...document },
        self,
        top: self,
        ...overrides
    } as unknown as Window;
}

describe("isExcluded", () => {
    it("counts a person's browser", () => {
        expect(isExcluded(browserWindow())).toBe(false);
        expect(isExcluded(browserWindow({ location: { search: "?ref=linkedin" } }))).toBe(false);
    });

    it("skips a load with ?preview=1, and the owner's marked browser", () => {
        expect(isExcluded(browserWindow({ location: { search: "?preview=1" } }))).toBe(true);
        expect(isExcluded(browserWindow({ location: { search: "?ref=cv&preview=1" } }))).toBe(true);
        expect(isExcluded(browserWindow({ localStorage: { getItem: (key: string) => (key === "skipgc" ? "t" : null) } }))).toBe(true);
    });

    it("skips automated browsers, frames and prerendering, as GoatCounter does", () => {
        expect(isExcluded(browserWindow({ navigator: { webdriver: true } }))).toBe(true);
        expect(isExcluded(browserWindow({ callPhantom: () => {} }))).toBe(true);
        expect(isExcluded(browserWindow({ __nightmare: {} }))).toBe(true);
        expect(isExcluded(browserWindow({}, { __selenium_unwrapped: true }))).toBe(true);
        expect(isExcluded(browserWindow({ top: {} }))).toBe(true);
        expect(isExcluded(browserWindow({}, { visibilityState: "prerender" }))).toBe(true);
    });

    it("still counts a browser that refuses storage", () => {
        const refusing = browserWindow();
        Object.defineProperty(refusing, "localStorage", {
            get() {
                throw new Error("SecurityError");
            }
        });
        expect(isExcluded(refusing)).toBe(false);
    });
});

describe("refOf", () => {
    it("reads the link's tag, in lower case", () => {
        expect(refOf("?ref=LinkedIn")).toBe("linkedin");
        expect(refOf("?utm_source=newsletter")).toBe("newsletter");
        expect(refOf("?utm_source=a&ref=b")).toBe("b");
        expect(refOf("")).toBe("");
    });

    it("keeps only the characters the counter accepts, and at most 40", () => {
        expect(refOf("?ref=Linked%20In%3Cb%3E")).toBe("linkedinb");
        expect(refOf(`?ref=${"x".repeat(60)}`)).toHaveLength(40);
    });
});

describe("originOf", () => {
    it("keeps only the referring site's origin, so a long address never overflows the beacon", () => {
        expect(originOf(`https://www.linkedin.com/feed/?trk=${"x".repeat(2000)}`)).toBe("https://www.linkedin.com");
        expect(originOf("")).toBe("");
        expect(originOf("not a url")).toBe("");
    });
});

describe("createVisibleClock", () => {
    it("adds up only the time the page was visible, in whole seconds", () => {
        let now = 0;
        const clock = createVisibleClock(() => now, true);
        now = 4_000;
        clock.hide();
        now = 60_000;
        expect(clock.total()).toBe(4);
        clock.show();
        now = 65_600;
        expect(clock.total()).toBe(10);
        clock.hide();
        clock.hide();
        now = 90_000;
        expect(clock.total()).toBe(10);
    });

    it("starts at zero when the page opens in the background", () => {
        let now = 0;
        const clock = createVisibleClock(() => now, false);
        now = 30_000;
        expect(clock.total()).toBe(0);
        clock.show();
        now = 31_000;
        expect(clock.total()).toBe(1);
    });
});
