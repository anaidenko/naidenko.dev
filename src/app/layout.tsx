import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Analytics } from "@/components/Analytics";
import { Spotlight } from "@/components/Spotlight";
import { site } from "@/content/site";
import { ogImageVersion } from "@/lib/og";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const title = `${site.name} · ${site.role}`;
const ogImage = { url: `/og.png?v=${ogImageVersion()}`, width: 1200, height: 630, type: "image/png", alt: `${site.name}, ${site.role}` };

export const metadata: Metadata = {
    metadataBase: new URL(site.url),
    title: { default: title, template: `%s · ${site.domain}` },
    description: site.description,
    alternates: { canonical: "/", types: { "text/markdown": "/index.md" } },
    authors: [{ name: site.name, url: site.url }],
    creator: site.name,
    openGraph: {
        type: "profile",
        url: site.url,
        siteName: site.domain,
        locale: "en_US",
        title,
        description: site.description,
        firstName: "Andrii",
        lastName: "Naidenko",
        images: [ogImage]
    },
    twitter: { card: "summary_large_image", title, description: site.description, images: [ogImage] },
    // The .ico comes first and is sized 32x32, not "any", so browsers that read SVG still pick the SVG.
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "32x32" },
            { url: "/icon.svg", type: "image/svg+xml" }
        ],
        apple: "/apple-touch-icon.png"
    }
};

export const viewport: Viewport = { themeColor: "#0b0c0e", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    const fonts = `${geist.variable} ${geistMono.variable}`;
    return (
        <html lang="en" className={fonts}>
            <body className="bg-canvas font-sans leading-relaxed text-ink antialiased selection:bg-accent selection:text-canvas">
                <Spotlight />
                {children}
                <Analytics />
            </body>
        </html>
    );
}
