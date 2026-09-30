import { describe, expect, it } from "vitest";

import { browserOf, deviceOf, inNetworks, isBot, languageOf, networkKey, osOf, parseIp, visitorHash } from "./visitor";

const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const SAFARI_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const EDGE_WINDOWS =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const OPERA_WINDOWS =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/123.0.0.0";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0";
const SAFARI_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const CHROME_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1";
const SAMSUNG_ANDROID =
    "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const CHROMEOS = "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const OWN_NETWORK = "2a02:587:4f09:b700::/64";

describe("parseIp", () => {
    it("reads IPv4 and IPv6 in their usual spellings", () => {
        expect(parseIp("203.0.113.9")).toEqual(new Uint8Array([203, 0, 113, 9]));
        expect(parseIp("::1")).toEqual(new Uint8Array([...Array(15).fill(0), 1]));
        expect(parseIp("2a02:587::1")).toEqual(new Uint8Array([0x2a, 0x02, 0x05, 0x87, ...Array(11).fill(0), 1]));
        expect(parseIp("2A02:0587:0:0:0:0:0:1")).toEqual(parseIp("2a02:587::1"));
    });

    it("reads an IPv4-mapped IPv6 address as IPv4", () => {
        expect(parseIp("::ffff:203.0.113.9")).toEqual(new Uint8Array([203, 0, 113, 9]));
    });

    it("refuses anything that is not an address", () => {
        for (const junk of ["", "hello", "256.1.1.1", "1.2.3", "1.2.3.4.5", "2a02:::1", "1:2:3:4:5:6:7:8:9", "12345::", "::1::"])
            expect(parseIp(junk), junk).toBeNull();
    });
});

describe("inNetworks", () => {
    it("matches an address inside an IPv6 /64, however it is spelled", () => {
        expect(inNetworks("2a02:587:4f09:b700:d433:c6fd:9126:27ab", OWN_NETWORK)).toBe(true);
        expect(inNetworks("2a02:587:4f09:b700:1::1", OWN_NETWORK)).toBe(true);
        expect(inNetworks("2A02:0587:4F09:B700::1", OWN_NETWORK)).toBe(true);
        expect(inNetworks("2a02:587:4f09:b701::1", OWN_NETWORK)).toBe(false);
    });

    it("matches IPv4 ranges and exact addresses in a comma-separated list", () => {
        const list = "198.51.100.0/24, 203.0.113.9";
        expect(inNetworks("198.51.100.77", list)).toBe(true);
        expect(inNetworks("203.0.113.9", list)).toBe(true);
        expect(inNetworks("203.0.113.10", list)).toBe(false);
        expect(inNetworks("::ffff:198.51.100.1", list)).toBe(true);
    });

    it("never matches across families, an empty list, junk entries or a bad address", () => {
        expect(inNetworks("203.0.113.9", OWN_NETWORK)).toBe(false);
        expect(inNetworks("2a02:587:4f09:b700::1", "203.0.113.0/24")).toBe(false);
        expect(inNetworks("203.0.113.9", "")).toBe(false);
        expect(inNetworks("203.0.113.9", "nonsense, 203.0.113.0/33, 203.0.113.0/24")).toBe(true);
        expect(inNetworks("203.0.113.9", "nonsense, 203.0.113.0/33")).toBe(false);
        expect(inNetworks("not an ip", "0.0.0.0/0")).toBe(false);
    });
});

describe("networkKey", () => {
    it("keeps an IPv4 address and the /64 of an IPv6 one", () => {
        expect(networkKey("203.0.113.9")).toBe("203.0.113.9");
        expect(networkKey("2a02:587:4f09:b700:d433:c6fd:9126:27ab")).toBe(OWN_NETWORK);
        expect(networkKey("2A02:0587:4F09:B700::1")).toBe(OWN_NETWORK);
        expect(networkKey("::ffff:203.0.113.9")).toBe("203.0.113.9");
        expect(networkKey("junk")).toBe("");
    });
});

describe("browserOf and osOf", () => {
    it.each([
        [CHROME_MAC, "Chrome", "macOS"],
        [SAFARI_MAC, "Safari", "macOS"],
        [EDGE_WINDOWS, "Edge", "Windows"],
        [OPERA_WINDOWS, "Opera", "Windows"],
        [FIREFOX_LINUX, "Firefox", "Linux"],
        [SAFARI_IPHONE, "Safari", "iOS"],
        [CHROME_IPHONE, "Chrome", "iOS"],
        [SAMSUNG_ANDROID, "Samsung Internet", "Android"],
        [CHROME_ANDROID, "Chrome", "Android"],
        [CHROMEOS, "Chrome", "ChromeOS"],
        ["Something/1.0", "Other", "Other"]
    ])("%s", (userAgent, browser, os) => {
        expect(browserOf(userAgent)).toBe(browser);
        expect(osOf(userAgent)).toBe(os);
    });
});

describe("deviceOf", () => {
    it("tells phones, tablets and desktops apart", () => {
        expect(deviceOf(SAFARI_IPHONE)).toBe("mobile");
        expect(deviceOf(CHROME_ANDROID)).toBe("mobile");
        expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
        expect(deviceOf("Mozilla/5.0 (Linux; Android 15; SM-X710) Chrome/140.0 Safari/537.36")).toBe("tablet");
        expect(deviceOf(CHROME_MAC)).toBe("desktop");
    });
});

describe("languageOf", () => {
    it("keeps the primary language of the first choice", () => {
        expect(languageOf("en-US,en;q=0.9")).toBe("en");
        expect(languageOf("uk,ru;q=0.8,en;q=0.5")).toBe("uk");
        expect(languageOf("EN-gb")).toBe("en");
    });

    it("gives nothing for a missing or meaningless header", () => {
        expect(languageOf(null)).toBe("");
        expect(languageOf("")).toBe("");
        expect(languageOf("*")).toBe("");
        expect(languageOf("12345")).toBe("");
    });
});

describe("isBot", () => {
    it("spots crawlers, headless browsers, HTTP libraries and audit tools", () => {
        for (const userAgent of [
            "",
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "curl/8.7.1",
            "python-requests/2.32.3",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
            "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
            "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
            "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)",
            "Go-http-client/2.0",
            "axios/1.7.7",
            "node-fetch/1.0"
        ])
            expect(isBot(userAgent), userAgent).toBe(true);
    });

    it("lets real browsers through", () => {
        for (const userAgent of [CHROME_MAC, SAFARI_IPHONE, SAMSUNG_ANDROID, EDGE_WINDOWS, FIREFOX_LINUX])
            expect(isBot(userAgent), userAgent).toBe(false);
    });
});

describe("visitorHash", () => {
    it("gives one visitor for one network and browser, whatever the rest of the address and the version", async () => {
        const first = await visitorHash("key", "2a02:587:4f09:b700:d433:c6fd:9126:27ab", CHROME_MAC);
        expect(first).toMatch(/^[0-9a-f]{32}$/);
        expect(await visitorHash("key", "2a02:587:4f09:b700::1", CHROME_MAC)).toBe(first);
        expect(await visitorHash("key", "2a02:587:4f09:b700::1", CHROME_MAC.replace("Chrome/140", "Chrome/141"))).toBe(first);
    });

    it("tells apart another key, network or browser", async () => {
        const first = await visitorHash("key", "203.0.113.9", CHROME_MAC);
        expect(await visitorHash("another key", "203.0.113.9", CHROME_MAC)).not.toBe(first);
        expect(await visitorHash("key", "203.0.113.10", CHROME_MAC)).not.toBe(first);
        expect(await visitorHash("key", "203.0.113.9", SAFARI_MAC)).not.toBe(first);
    });

    it("gives no visitor without a key or an address", async () => {
        expect(await visitorHash("", "203.0.113.9", CHROME_MAC)).toBeNull();
        expect(await visitorHash("key", "", CHROME_MAC)).toBeNull();
        expect(await visitorHash("key", "junk", CHROME_MAC)).toBeNull();
    });
});
