import { readFile } from "node:fs/promises";
import { join } from "node:path";

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
