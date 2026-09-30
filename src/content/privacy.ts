import { site } from "./site";

/** The privacy note. "{email}" is rendered as a link to the contact address. */
export const privacy = {
    title: "Privacy",
    description: `What the contact form on ${site.domain} collects, why, and for how long.`,
    updated: "Updated September 2026.",
    sections: [
        {
            title: "Who is responsible",
            paragraphs: [
                `This site belongs to ${site.name}, a software developer based in Athens, Greece. For anything about your data, write to {email}.`
            ]
        },
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
        },
        {
            title: "Who else handles it",
            paragraphs: [
                "Cloudflare hosts the site, runs Turnstile and delivers the form’s email to my inbox, where my email provider stores it. The form also posts your message to my private Slack workspace, so it reaches me even if the email does not, and Slack stores it. The Toptal badge on the page loads a typeface from Adobe Fonts (use.typekit.net), which receives your IP address. GoatCounter counts visits for me, as described below. Nothing is sold or shared for advertising."
            ]
        },
        {
            title: "Visit counts, without cookies",
            paragraphs: [
                "The site sets no cookies and stores nothing in your browser.",
                "Its own counter, which runs on Cloudflare, records each visit: the time, the page, the site you came from or the tag in the link you followed (such as ?ref=linkedin), which sections of the page you scrolled to, how long the page was open in front of you, and the buttons and links you clicked, such as “Contact me” or the Toptal badge. From your browser it records its name, your operating system, whether you use a phone, a tablet or a computer, your preferred language and your screen width.",
                // 13 months: VISITOR_MONTHS in worker/retention.ts (2026-09-30).
                "From your IP address, Cloudflare estimates your country, region and city, with that city’s coordinates, and names your network, such as your internet provider. The counter never stores the IP address itself. To tell a returning visitor from a new one, it stores a code computed with a secret key from your network address, browser and operating system, which cannot be turned back into the address. The code is erased after 13 months; the rest of the record is kept without a time limit.",
                // The retention is GoatCounter's own setting (0, "never delete"), seen by Andrii on 2026-09-30.
                "GoatCounter (goatcounter.com, run from Ireland) counts the same page views and clicks for a dashboard. It stores only daily totals by page, referring site or campaign, browser, operating system, country (and, in the United States, Russia and China, region), language and screen width, and it does not store your IP address. It is set to keep these totals without a time limit.",
                "The legal basis is my legitimate interest in knowing how the site is used and which links bring visitors (GDPR Article 6(1)(f)). You can object to it at {email}."
            ]
        },
        {
            title: "Your rights",
            paragraphs: [
                "You can ask for a copy of your data, a correction or its deletion at {email}. You can also complain to the Hellenic Data Protection Authority (dpa.gr)."
            ]
        }
    ]
} as const;
