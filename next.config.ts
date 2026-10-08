import type { NextConfig } from "next";

const toptal = process.env.NEXT_PUBLIC_SITE_VARIANT === "toptal";

const nextConfig: NextConfig = {
    output: "export",
    // A static export goes to a custom distDir instead of out/; both builds share .next.
    ...(toptal ? { distDir: "out-toptal" } : {}),
    images: { unoptimized: true },
    // The Toptal build swaps the form and the email for nothing at import time: a page ships the
    // JavaScript of every client component it imports, so a condition on rendering is not enough.
    ...(toptal ? { turbopack: { resolveAlias: { "@/components/ContactDirect": "./src/components/ContactDirect.toptal.tsx" } } } : {})
};

export default nextConfig;
