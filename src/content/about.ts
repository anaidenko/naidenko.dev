import { compactFigure } from "@/lib/format";

import { storeMetrics } from "./metrics";

/** The About from LinkedIn (live since 2026-09-24): paragraphs 1, 2 and 4, verbatim. */
export const aboutParagraphs: readonly string[] = [
    "Full-stack engineer with 19 years of experience, working through Toptal since 2019 and Upwork (Top-Rated, 100% job success) since 2014. Core stack: Node.js, Angular, TypeScript, MongoDB/MySQL, AWS — with a cross-platform mobile specialty in Ionic and Capacitor.",
    "Since 2019 I have been the sole mobile developer for a US workforce-management SaaS: an iOS/Android app with 100K+ installs that I own end to end — architecture, offline mode, GPS and geofencing, push notifications, security features, native integrations and store releases. In parallel I have delivered full-stack products for real-estate, education and healthcare clients: APIs, billing, email infrastructure, video conferencing, admin portals.",
    "Master’s degree in Computer Science. Based in Greece, working with US clients in EST overlap."
];

/**
 * Experience measured from June 2007; the store figures come from metrics.ts. Repeat clients,
 * counted 2026-09-24: Brokerloop and RentWise on Toptal (three engagements each), and three
 * Upwork clients with three to six contracts each.
 */
export const numbers: readonly { value: string; label: string }[] = [
    { value: "19", label: "years building software, since 2007" },
    { value: compactFigure(storeMetrics.googlePlayInstalls), label: "installs on Google Play" },
    { value: storeMetrics.appStoreRating, label: `App Store rating, from ${storeMetrics.appStoreRatings} ratings` },
    { value: "5", label: "clients hired me three or more times" }
];
