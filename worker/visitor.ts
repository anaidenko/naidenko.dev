/** What the Worker can tell from a request's address and headers, without storing either. */

export type Device = "mobile" | "tablet" | "desktop";

const BOT =
    /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java\/|scrapy|puppeteer|playwright|selenium|phantomjs|pagespeed|gtmetrix|pingdom|uptime|semrush|ahrefs|perplexity|ccbot/i;

const BROWSERS: [RegExp, string][] = [
    [/Edg(e|A|iOS)?\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/SamsungBrowser\//, "Samsung Internet"],
    [/Firefox\/|FxiOS\//, "Firefox"],
    [/Chrome\/|CriOS\//, "Chrome"],
    [/Version\/[\d.]+.*Safari\//, "Safari"]
];

// Order matters: iPhones claim to be "like Mac OS X", and Android runs on Linux.
const SYSTEMS: [RegExp, string][] = [
    [/Windows NT|Windows Phone/, "Windows"],
    [/iPhone|iPad|iPod/, "iOS"],
    [/Android/, "Android"],
    [/CrOS/, "ChromeOS"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Linux|X11/, "Linux"]
];

export function isBot(userAgent: string): boolean {
    return userAgent === "" || BOT.test(userAgent);
}

export function deviceOf(userAgent: string): Device {
    if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) return "tablet";
    return /Mobi|iPhone|Android/i.test(userAgent) ? "mobile" : "desktop";
}

export function browserOf(userAgent: string): string {
    return BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Other";
}

export function osOf(userAgent: string): string {
    return SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Other";
}

/** The primary language of the visitor's first choice, such as "en", or "". */
export function languageOf(acceptLanguage: string | null): string {
    return /^\s*([a-z]{2,3})(?![a-z])/i.exec(acceptLanguage ?? "")?.[1].toLowerCase() ?? "";
}

function parseIpv4(text: string): number[] | null {
    const parts = text.split(".");
    if (parts.length !== 4 || !parts.every(part => /^\d{1,3}$/.test(part))) return null;
    const bytes = parts.map(Number);
    return bytes.every(byte => byte <= 255) ? bytes : null;
}

/** The 16-bit groups of one side of "::"; a dotted IPv4 tail is allowed only at the very end. */
function wordsOf(part: string, endsAddress: boolean): number[] | null {
    if (part === "") return [];
    const words: number[] = [];
    const groups = part.split(":");
    for (const [index, group] of groups.entries()) {
        if (endsAddress && index === groups.length - 1 && group.includes(".")) {
            const v4 = parseIpv4(group);
            if (!v4) return null;
            words.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]);
        } else if (/^[0-9a-f]{1,4}$/i.test(group)) words.push(parseInt(group, 16));
        else return null;
    }
    return words;
}

function parseIpv6(text: string): Uint8Array | null {
    const halves = text.split("::");
    if (halves.length > 2) return null;
    const compressed = halves.length === 2;
    const head = wordsOf(halves[0], !compressed);
    const tail = compressed ? wordsOf(halves[1], true) : [];
    if (!head || !tail) return null;
    const missing = 8 - head.length - tail.length;
    if (compressed ? missing < 1 : missing !== 0) return null;
    const words = [...head, ...Array<number>(missing).fill(0), ...tail];
    const bytes = new Uint8Array(16);
    words.forEach((word, index) => {
        bytes[index * 2] = word >> 8;
        bytes[index * 2 + 1] = word & 0xff;
    });
    return bytes;
}

/** An address as 4 bytes (IPv4, including IPv4-mapped IPv6) or 16 bytes (IPv6), or null. */
export function parseIp(text: string): Uint8Array | null {
    const trimmed = text.trim();
    if (!trimmed.includes(":")) {
        const v4 = parseIpv4(trimmed);
        return v4 ? new Uint8Array(v4) : null;
    }
    const bytes = parseIpv6(trimmed);
    if (!bytes) return null;
    const mapped = bytes.slice(0, 10).every(byte => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
    return mapped ? bytes.slice(12) : bytes;
}

function samePrefix(address: Uint8Array, network: Uint8Array, bits: number): boolean {
    const whole = Math.floor(bits / 8);
    for (let index = 0; index < whole; index++) if (address[index] !== network[index]) return false;
    const rest = bits % 8;
    if (rest === 0) return true;
    const mask = (0xff << (8 - rest)) & 0xff;
    return (address[whole] & mask) === (network[whole] & mask);
}

/** Whether the address is in a comma-separated list of CIDR ranges and exact addresses. */
export function inNetworks(ip: string, list: string): boolean {
    const address = parseIp(ip);
    if (!address) return false;
    return list.split(",").some(entry => {
        const [base, bitsText, extra] = entry.trim().split("/");
        const network = parseIp(base);
        if (extra !== undefined || !network || network.length !== address.length) return false;
        const size = network.length * 8;
        const bits = bitsText === undefined ? size : /^\d{1,3}$/.test(bitsText) ? Number(bitsText) : -1;
        return bits >= 0 && bits <= size && samePrefix(address, network, bits);
    });
}

/** An IPv4 address as it is, or an IPv6 address's /64: the rest of IPv6 rotates for privacy. */
export function networkKey(ip: string): string {
    const bytes = parseIp(ip);
    if (!bytes) return "";
    if (bytes.length === 4) return bytes.join(".");
    const words = [0, 1, 2, 3].map(index => ((bytes[index * 2] << 8) | bytes[index * 2 + 1]).toString(16));
    return `${words.join(":")}::/64`;
}

/**
 * Tells a returning visitor from a new one: a keyed hash of the network, the browser and the
 * system, which cannot be turned back into the address without the key. Null without either.
 */
export async function visitorHash(key: string, ip: string, userAgent: string): Promise<string | null> {
    const network = networkKey(ip);
    if (!key || !network) return null;
    const encoder = new TextEncoder();
    const hmac = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", hmac, encoder.encode(`${network}|${browserOf(userAgent)}|${osOf(userAgent)}`));
    return Array.from(new Uint8Array(signature).slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join("");
}
