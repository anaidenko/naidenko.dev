import { TOPTAL_SITE } from "@/lib/variant";

import { site } from "./site";

/**
 * Plain text, never a mailto link: the GDPR asks for the controller's contact details (Art. 13),
 * and the Toptal build links no address (plan 2026-10-08-site-toptal-mode, second round, point 1).
 */
const ADDRESS = "privacy@naidenko.dev";

type Section = { title: string; paragraphs: readonly string[] };

const responsible: Section = {
    title: "Who is responsible",
    paragraphs: [
        `This site belongs to ${site.name}, a software developer based in Athens, Greece. For anything about your data, write to ${ADDRESS}.`
    ]
};

/** The contact form's sections: naidenko.dev has the form, the Toptal build does not. */
const form: readonly Section[] = [
    {
        title: "What the contact form collects",
        paragraphs: [
            "Your name, your email address, your company or website if you give it, and your message.",
            "To keep out spam, Cloudflare Turnstile checks your browser when you use the form. Cloudflare processes your IP address and browser signals for that check."
        ]
    },
    {
        title: "Why",
        paragraphs: [
            "Only to read your message, reply to it and discuss what you propose. The legal basis is your own request: steps you asked for before a possible contract (GDPR Article 6(1)(b))."
        ]
    },
    {
        title: "How long it is kept",
        paragraphs: [
            "Your message stays in my mailbox and in Slack for up to twelve months after our last exchange. If we start working together, it is kept for as long as the work and its records require."
        ]
    }
];

const handlers: Section = {
    title: "Who else handles it",
    paragraphs: [
        TOPTAL_SITE
            ? "Cloudflare hosts the site. The Toptal badge on the page loads a typeface from Adobe Fonts (use.typekit.net), which receives your IP address. GoatCounter counts visits for me, as described below. Nothing is sold or shared for advertising."
            : "Cloudflare hosts the site, runs Turnstile and delivers the form’s email to my inbox, where my email provider stores it. The form also posts your message to my private Slack workspace, so it reaches me even if the email does not, and Slack stores it. The Toptal badge on the page loads a typeface from Adobe Fonts (use.typekit.net), which receives your IP address. GoatCounter counts visits for me, as described below. Nothing is sold or shared for advertising."
    ]
};

const counts: Section = {
    title: "Visit counts, without cookies",
    paragraphs: [
        "The site sets no cookies and stores nothing in your browser.",
        `Its own counter, which runs on Cloudflare, records each visit: the time, the page, the site you came from or the tag in the link you followed (such as ${TOPTAL_SITE ? "?ref=123456" : "?ref=linkedin"}), which sections of the page you scrolled to, how long the page was open in front of you, and the buttons and links you clicked, such as ${TOPTAL_SITE ? "the Toptal badge" : "“Contact me” or the Toptal badge"}. From your browser it records its name, your operating system, whether you use a phone, a tablet or a computer, your preferred language and your screen width.`,
        // 13 months: VISITOR_MONTHS in worker/retention.ts (2026-09-30).
        "From your IP address, Cloudflare estimates your country, region and city, with that city’s coordinates, and names your network, such as your internet provider. The counter never stores the IP address itself. To tell a returning visitor from a new one, it stores a code computed with a secret key from your network address, browser and operating system; the code does not contain the address. The code is erased after 13 months; the rest of the record is kept without a time limit.",
        // The retention is GoatCounter's own setting (0, "never delete"), seen by Andrii on 2026-09-30.
        "GoatCounter (goatcounter.com, run from Ireland) counts the same page views and clicks for a dashboard. It stores only daily totals by page, referring site or campaign, browser, operating system, country (and, in the United States, Russia and China, region), language and screen width, and it does not store your IP address. It is set to keep these totals without a time limit.",
        `The legal basis is my legitimate interest in knowing how the site is used and which links bring visitors (GDPR Article 6(1)(f)). You can object to it at ${ADDRESS}.`
    ]
};

const rights: Section = {
    title: "Your rights",
    paragraphs: [
        `You can ask for a copy of your data, a correction or its deletion at ${ADDRESS}. You can also complain to the Hellenic Data Protection Authority (dpa.gr).`
    ]
};

/** The privacy note: on the Toptal build, without the contact form it does not have. */
export const privacy = {
    title: "Privacy",
    description: TOPTAL_SITE
        ? `What ${site.domain} records about a visit, why, and for how long.`
        : `What the contact form on ${site.domain} collects, why, and for how long.`,
    updated: "Updated October 2026.",
    sections: [responsible, ...(TOPTAL_SITE ? [] : form), handlers, counts, rights]
};
