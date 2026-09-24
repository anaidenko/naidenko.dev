export interface ExperienceEntry {
    period: string;
    role: string;
    company: string;
    url?: string;
    summary: string;
    chips: readonly string[];
    links?: readonly { label: string; url: string; store: string }[];
}

/**
 * Condensed from the live Toptal entries: talent view saved 2026-09-23 (Buddy Punch, Brokerloop,
 * RentWise) and the public page saved 2026-09-16 (USC ICT).
 */
export const experience: readonly ExperienceEntry[] = [
    {
        period: "2019 — Present",
        role: "Senior Mobile Developer",
        company: "Buddy Punch",
        url: "https://buddypunch.com/",
        summary:
            "Owned the iOS and Android app end to end as its sole developer for seven years: architecture, features, native integrations and every store release. Built Offline Mode, the product’s most requested feature of 2025, and the GPS layer the product sells on, and carried the app from Cordova to Angular 21, Ionic 8 and Capacitor 8.",
        chips: ["Angular", "Ionic", "Capacitor", "TypeScript", "Swift", "Java"],
        links: [
            { label: "App Store · 4.9 ★", url: "https://apps.apple.com/us/app/buddy-punch/id1100685927", store: "app_store" },
            {
                label: "Google Play · 100,000+ installs",
                url: "https://play.google.com/store/apps/details?id=com.BuddyPunch.Mobile",
                store: "google_play"
            }
        ]
    },
    {
        period: "2020 — 2026",
        role: "Full-stack Developer",
        company: "Brokerloop",
        url: "https://www.brokerloop.com/",
        summary:
            "Six years and 1,800+ commits on the Node.js API behind every listing, contact and campaign, over three engagements. Built the platform’s video conferencing product, its Stripe subscriptions and its own email infrastructure, then documented the API as an OpenAPI spec and built an MCP server so assistants like Claude can run the product through it.",
        chips: ["Node.js", "TypeScript", "AngularJS", "React", "MongoDB", "MySQL", "AWS", "Stripe", "MCP"]
    },
    {
        period: "2022 — 2025",
        role: "MEAN Full-stack Developer",
        company: "RentWise",
        url: "https://www.rentwise.org/",
        summary:
            "Built the learning engine of a renter-education platform: course authoring, quizzes, certificates and pacing rules. Turned it into a paid product with PayPal checkout, moved its video library to in-house HLS streaming, and ran the security audit and fixed what it found, over three engagements.",
        chips: ["Angular", "Node.js", "Express", "MongoDB", "PayPal", "HLS", "ArcGIS", "AWS"]
    },
    {
        period: "2019 — 2020",
        role: "Senior Cross-Platform Developer",
        company: "USC Institute for Creative Technologies",
        url: "https://ict.usc.edu/",
        summary:
            "Took a desktop-only mental-health support app to the phone as part of the team: responsive layouts, phone-sized forms, quizzes and assessments. Packaged it with Ionic and Capacitor for the App Store and Google Play.",
        chips: ["Angular", "NgRx", "Ionic", "Capacitor", "Cordova", "TypeScript"]
    }
];

export const fullResume = {
    label: "View full résumé on Toptal",
    url: "https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7"
};

/**
 * Before 2019, condensed from the same live Toptal profile (public page saved 2026-09-16). The
 * Inovo Studios and OnCue Technology line is the client's own verdict, kept as given.
 */
export const earlierExperience: readonly ExperienceEntry[] = [
    {
        period: "2014 — 2019",
        role: "Senior Full-stack Developer",
        company: "Freelance clients",
        summary:
            "Built a blockchain-based content-licensing marketplace, a social-media marketing platform for franchise organizations, and the web and mobile apps of Sellr, a retail platform. A cloud task tracker I built for project coordination revolutionized Inovo Studios and OnCue Technology’s workflows and became one of the year’s highlights for the client. Top-rated, with a 100% job-success score.",
        chips: ["Node.js", "AngularJS", "Ionic", "AWS", "Docker", "RabbitMQ", "PostgreSQL", "Redis"]
    },
    {
        period: "2011 — 2014",
        role: "Lead .NET Software Engineer",
        company: "EPAM Systems",
        url: "https://www.epam.com/",
        summary:
            "Led a team of six to ten as Scrum master. Built the financial portlets traders watch the markets through on the Thomson Reuters platform, on an MVVM-C JavaScript framework I designed, and shipped WPF apps to the Bloomberg App Portal. Interviewed senior candidates, spoke at public IT conferences, and was promoted twice in three years.",
        chips: ["C#", ".NET", "JavaScript", "WPF", "SQL Server", "Scrum"]
    },
    {
        period: "2007 — 2011",
        role: ".NET Software Engineer",
        company: "GlobalLogic",
        url: "https://www.globallogic.com/",
        summary:
            "Worked on CustomCD, Digital River’s burn-on-demand e-commerce service: the admin and partner-support web apps, the packaging, shipment and reporting services, and the notifications behind orders fulfilled across the US and Germany.",
        chips: ["C#", "ASP.NET", "WCF", "SQL Server", "JavaScript"]
    }
];
