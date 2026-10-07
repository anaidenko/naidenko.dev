import type { MetadataRoute } from "next";

import { site } from "@/content/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: site.url, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
        { url: `${site.url}/audit`, changeFrequency: "monthly", priority: 0.8 },
        { url: `${site.url}/audit/sample`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.3 }
    ];
}
