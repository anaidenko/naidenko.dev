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
                "Its own counter, which runs on Cloudflare, adds one to daily totals: the page, the site you came from, your country, and whether you use a phone, a tablet or a computer. It counts clicks on buttons and links the same way, such as “Contact me” or the Toptal badge. It keeps no IP address and nothing that tells one visitor from another, so the totals are kept without a time limit.",
                "GoatCounter (goatcounter.com, run from Ireland) counts the same page views and clicks for a dashboard. It stores only daily totals by page, referring site, browser, operating system, country, language and screen width, and it does not store your IP address. Its free plan keeps these totals for six months.",
                "The legal basis is my legitimate interest in knowing how the site is used (GDPR Article 6(1)(f)), limited to counts that do not identify you."
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
