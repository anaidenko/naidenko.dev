import { CODE_AUDIT_ID } from "./sections";

export interface Service {
    title: string;
    text: string;
    proof: string;
    /** The anchor a menu entry scrolls to. */
    id?: string;
    /** A page of the site that sells this service. */
    url?: string;
}

/**
 * Each offer names the case above that backs it. Code audits: joined from /audit's description and
 * hero (`audit.ts`), both already live.
 */
export const services: readonly Service[] = [
    {
        title: "Code audits",
        id: CODE_AUDIT_ID,
        url: "/audit",
        text: "An independent audit of your codebase before a launch, a fundraise or a handover: scanners first, then an AI agent per aspect, and my own review of every finding, in a report your founders and engineers can act on.",
        proof: "Auditdesk and its sample report"
    },
    {
        title: "Mobile apps with Ionic and Capacitor",
        text: "iOS and Android from one TypeScript codebase: offline mode, GPS and geofencing, push notifications, native plugins in Swift and Java, and every store release, including moving Cordova apps to Capacitor and builds from Ionic Appflow to fastlane.",
        proof: "Buddy Punch"
    },
    {
        title: "Full-stack web products",
        text: "Node.js APIs with the billing, email and video features products run on, and Angular or React front ends to match.",
        proof: "Brokerloop, RentWise"
    },
    {
        title: "Claude Code tooling and MCP servers",
        text: "Plugins that fit Claude Code into your team’s workflow, and MCP servers that let AI assistants work with your product through its own API.",
        proof: "the open-source plugins, Brokerloop"
    }
];
