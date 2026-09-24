const verified = { lead: "Verified Expert", rest: "in Engineering at Toptal" } as const;
const location = "Athens, Greece";

export const site = {
    name: "Andrii Naidenko",
    role: "Full-stack and Mobile Developer",
    tagline: "I build mobile apps and full-stack products, and own them end to end.",
    verified,
    location,
    meta: `${verified.lead} ${verified.rest} · ${location}`,
    description:
        "Full-stack and mobile developer since 2007: iOS and Android apps with Ionic and Capacitor, Node.js back ends, Angular and React front ends.",
    domain: "naidenko.dev",
    url: "https://naidenko.dev",
    email: "hello@naidenko.dev",
    photo: { src: "/andrii-naidenko.jpg", alt: "Andrii Naidenko" },
    links: {
        github: "https://github.com/anaidenko",
        linkedin: "https://www.linkedin.com/in/anaidenko/",
        toptal: "https://www.toptal.com/developers/resume/andrii-naidenko",
        // The badge's referral code, on every Toptal link a visitor can click.
        toptalReferral: "https://www.toptal.com/developers/resume/andrii-naidenko#qjl3b7"
    }
};
