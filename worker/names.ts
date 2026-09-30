const regions = new Intl.DisplayNames(["en"], { type: "region" });
const languages = new Intl.DisplayNames(["en"], { type: "language" });

function nameOf(names: Intl.DisplayNames, code: string): string {
    try {
        return names.of(code) ?? code;
    } catch {
        return code;
    }
}

/** A country's English name from Cloudflare's code; "XX" is Cloudflare's "no country", "T1" Tor. */
export function countryName(code: string): string {
    if (code === "" || code === "XX") return "Unknown";
    if (code === "T1") return "Tor";
    return nameOf(regions, code);
}

export function languageName(code: string): string {
    return code === "" ? "Unknown" : nameOf(languages, code);
}
