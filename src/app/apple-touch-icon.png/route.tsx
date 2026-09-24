import { ImageResponse } from "next/og";

import { geistFonts } from "@/lib/og";

export const dynamic = "force-static";
const size = { width: 180, height: 180 };

/** The iOS home-screen icon at /apple-touch-icon.png: the favicon's "N" on the page background. */
export async function GET() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0b0c0e",
                color: "#bef264",
                fontFamily: "Geist",
                fontSize: 124,
                fontWeight: 700
            }}
        >
            N
        </div>,
        { ...size, fonts: await geistFonts() }
    );
}
