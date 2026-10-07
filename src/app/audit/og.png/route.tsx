import { ImageResponse } from "next/og";

import { audit } from "@/content/audit";
import { site } from "@/content/site";
import { geistFonts } from "@/lib/og";

export const dynamic = "force-static";
const size = { width: 1200, height: 630 };

/** The link preview of /audit, rendered at build time in the style of /og.png. */
export async function GET() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "72px 88px",
                backgroundColor: "#0b0c0e",
                backgroundImage: "radial-gradient(circle at 16% 10%, rgba(190, 242, 100, 0.16), rgba(11, 12, 14, 0) 58%)",
                color: "#f4f4f5",
                fontFamily: "Geist"
            }}
        >
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: "#bef264", textTransform: "uppercase" }}>
                {`${site.domain}${audit.path}`}
            </div>
            <div style={{ marginTop: 28, fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>{audit.title}</div>
            <div style={{ marginTop: 28, fontSize: 32, lineHeight: 1.3, color: "#a1a1aa" }}>{audit.og}</div>
            <div style={{ marginTop: 40, fontSize: 24, color: "#8b8b95" }}>{`${site.name} · ${site.meta}`}</div>
        </div>,
        { ...size, fonts: await geistFonts() }
    );
}
