import { describe, expect, it } from "vitest";

import {
    applySkipToggle,
    chosenToCount,
    createVisibleClock,
    detailOf,
    goatcounterPath,
    isExcluded,
    landingRef,
    originOf,
    refOf,
    referrerTag,
    toptalRef,
    withRef
} from "./analytics";

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

describe("applySkipToggle", () => {
    /** A browser at `search` whose storage keeps what is set in it. */
    function storingAt(search: string) {
        const stored = new Map<string, string>();
        const win = browserWindow({
            location: { search },
            localStorage: {
                getItem: (key: string) => stored.get(key) ?? null,
                setItem: (key: string, value: string) => stored.set(key, value)
            }
        });
        return { win, stored };
    }

    it("keeps the owner's browser out with ?skipgc=t, and counts it again with ?skipgc=f", () => {
        const out = storingAt("?skipgc=t");
        applySkipToggle(out.win);
        expect(out.stored.get("skipgc")).toBe("t");
        expect(isExcluded(out.win)).toBe(true);

        const back = storingAt("?skipgc=f");
        applySkipToggle(back.win);
        expect(isExcluded(back.win)).toBe(false);
        expect(chosenToCount(back.win)).toBe(true);
    });

    it("stores nothing for any other value or none", () => {
        for (const search of ["", "?skipgc=x", "?ref=toptal"]) {
            const page = storingAt(search);
            applySkipToggle(page.win);
            expect(page.stored.size, search).toBe(0);
        }
    });

    it("leaves a browser that refuses storage counted, without an error", () => {
        const refusing = browserWindow({
            location: { search: "?skipgc=t" },
            localStorage: {
                setItem: () => {
                    throw new Error("denied");
                }
            }
        });
        expect(() => applySkipToggle(refusing)).not.toThrow();
    });
});

describe("chosenToCount", () => {
    const storing = (flag: string | null) => browserWindow({ localStorage: { getItem: () => flag } });

    it("is true only in a browser where the owner pressed Count it again on /stats", () => {
        expect(chosenToCount(storing("f"))).toBe(true);
        expect(chosenToCount(storing("t"))).toBe(false);
        expect(chosenToCount(storing(null))).toBe(false);
    });

    it("is false in a browser that refuses storage", () => {
        const refusing = browserWindow();
        Object.defineProperty(refusing, "localStorage", {
            get() {
                throw new Error("SecurityError");
            }
        });
        expect(chosenToCount(refusing)).toBe(false);
    });
});

describe("withRef", () => {
    it("adds this page's tag to a link, keeping its query and its fragment", () => {
        expect(withRef("/audit/sample", "?ref=LinkedIn")).toBe("/audit/sample?ref=linkedin");
        expect(withRef("/audit#order", "?utm_source=x")).toBe("/audit?ref=x#order");
        expect(withRef("/audit?ref=old&a=1", "?ref=new")).toBe("/audit?ref=new&a=1");
    });
    it("leaves the link alone without a tag", () => {
        expect(withRef("/audit", "")).toBe("/audit");
    });
    it("falls back to a Toptal visit's tag once the address has lost it", () => {
        expect(withRef("/", "", "toptal-509168")).toBe("/?ref=toptal-509168");
        expect(withRef("/", "?ref=toptal-1", "toptal-2")).toBe("/?ref=toptal-1");
        expect(withRef("/", "", "")).toBe("/");
    });
});

describe("refOf", () => {
    it("reads the link's tag, in lower case", () => {
        expect(refOf("?ref=LinkedIn")).toBe("linkedin");
        expect(refOf("?utm_source=newsletter")).toBe("newsletter");
        expect(refOf("?utm_source=a&ref=b")).toBe("b");
        expect(refOf("?ref=&utm_source=newsletter")).toBe("newsletter");
        expect(refOf("")).toBe("");
    });

    it("keeps only the characters the counter accepts, and at most 40", () => {
        expect(refOf("?ref=Linked%20In%3Cb%3E")).toBe("linkedinb");
        expect(refOf(`?ref=${"x".repeat(60)}`)).toHaveLength(40);
    });
});

describe("landingRef", () => {
    it("takes the link's tag, else the tag of the site that referred the visit", () => {
        expect(landingRef("?ref=linkedin", "", false)).toBe("linkedin");
        expect(landingRef("", "https://github.com/", false)).toBe("github");
        expect(landingRef("?ref=x", "https://github.com/", false)).toBe("x");
        expect(landingRef("", "https://www.linkedin.com/", false)).toBe("");
        expect(landingRef("", "", false)).toBe("");
    });

    it("counts every visit to the Toptal build as toptal, and a bare tag such as a job's ID as toptal-<tag>", () => {
        expect(landingRef("", "", true)).toBe("toptal");
        expect(landingRef("?ref=509168", "", true)).toBe("toptal-509168");
        expect(landingRef("?ref=toptal-509168", "", true)).toBe("toptal-509168");
        expect(landingRef("", "https://github.com/", true)).toBe("toptal");
    });
});

describe("toptalRef", () => {
    it("prefixes a bare tag, keeps a toptal one and names an untagged visit", () => {
        expect(toptalRef("")).toBe("toptal");
        expect(toptalRef("509168")).toBe("toptal-509168");
        expect(toptalRef("toptal-509168")).toBe("toptal-509168");
        expect(toptalRef("toptal")).toBe("toptal");
    });

    it("stays within the counter's 40 characters", () => {
        expect(toptalRef("9".repeat(40))).toBe(`toptal-${"9".repeat(33)}`);
    });
});

describe("referrerTag", () => {
    it("tags a visit GitHub sent, whose profile links the bare address", () => {
        expect(referrerTag("https://github.com/")).toBe("github");
        expect(referrerTag("https://github.com/anaidenko")).toBe("github");
    });

    it("leaves every other referrer, and anything that is not an address, untagged", () => {
        expect(referrerTag("https://gist.github.com/")).toBe("");
        expect(referrerTag("https://notgithub.com/")).toBe("");
        expect(referrerTag("https://www.linkedin.com/")).toBe("");
        expect(referrerTag("")).toBe("");
        expect(referrerTag("github.com")).toBe("");
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
