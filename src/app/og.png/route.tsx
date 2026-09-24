import { ImageResponse } from "next/og";

import { site } from "@/content/site";
import { OG_PHOTO, dataUrl, geistFonts } from "@/lib/og";

export const dynamic = "force-static";
const size = { width: 1200, height: 630 };

/**
 * The link preview for LinkedIn, Facebook, X, Slack and messengers, rendered to /og.png at build
 * time. A route with an extension, not the opengraph-image convention: a static export writes that
 * one without ".png", and the host then serves it with no Content-Type.
 */
export async function GET() {
    const [fonts, photo] = await Promise.all([geistFonts(), dataUrl(OG_PHOTO, "image/jpeg")]);
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "72px 88px",
                backgroundColor: "#0b0c0e",
                backgroundImage: "radial-gradient(circle at 16% 10%, rgba(190, 242, 100, 0.16), rgba(11, 12, 14, 0) 58%)",
                color: "#f4f4f5",
                fontFamily: "Geist"
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: "#bef264", textTransform: "uppercase" }}>
                    {site.domain}
                </div>
                <div style={{ marginTop: 28, fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>{site.name}</div>
                <div style={{ marginTop: 22, fontSize: 38 }}>{site.role}</div>
                <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.35, color: "#a1a1aa" }}>{site.tagline}</div>
                <div style={{ marginTop: 40, fontSize: 22, color: "#8b8b95" }}>{site.meta}</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> only */}
            <img
                src={photo}
                alt=""
                width={300}
                height={300}
                style={{ borderRadius: 9999, border: "4px solid rgba(190, 242, 100, 0.55)" }}
            />
        </div>,
        { ...size, fonts: await fonts }
    );
}
