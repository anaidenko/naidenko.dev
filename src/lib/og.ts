import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { site } from "@/content/site";

export const OG_PHOTO = "assets/photo/andrii-naidenko-600.jpg";
const OG_ROUTE = "src/app/og.png/route.tsx";

/**
 * A short hash of everything the preview image shows, for its URL (`/og.png?v=…`). LinkedIn keeps
 * one rendition per image URL, and a first 160 px copy is never replaced; a new URL makes it fetch
 * the image again at full size.
 */
export function ogImageVersion(): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify([site.name, site.role, site.tagline, site.meta, site.domain]));
    for (const path of [OG_PHOTO, OG_ROUTE]) hash.update(readFileSync(join(process.cwd(), path)));
    return hash.digest("hex").slice(0, 8);
}

/** Geist for images generated at build time (next/og reads TTF, OTF and WOFF, not WOFF2). */
export async function geistFonts() {
    const [regular, bold] = await Promise.all([
        readFile(join(process.cwd(), "assets/fonts/Geist-Regular.woff")),
        readFile(join(process.cwd(), "assets/fonts/Geist-Bold.woff"))
    ]);
    return [
        { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
        { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const }
    ];
}

/** A file from the repository as a data URL, for <img> inside generated images. */
export async function dataUrl(path: string, type: string) {
    const bytes = await readFile(join(process.cwd(), path));
    return `data:${type};base64,${bytes.toString("base64")}`;
}
