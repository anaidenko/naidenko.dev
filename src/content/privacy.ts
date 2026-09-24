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
                "Your message stays in my mailbox, or in Slack if it was forwarded there, for up to twelve months after our last exchange. If we start working together, it is kept for as long as the work and its records require."
            ]
        },
        {
            title: "Who else handles it",
            paragraphs: [
                "Cloudflare hosts the site, runs Turnstile and delivers the form’s email to my inbox, where my email provider stores it. If that email cannot be delivered, the form forwards your message to my private Slack workspace instead, so it is not lost, and Slack stores it. The Toptal badge on the page loads a typeface from Adobe Fonts (use.typekit.net), which receives your IP address. If you allow analytics, Google receives the data described below. Nothing is sold or shared for advertising."
            ]
        },
        {
            title: "Cookies and analytics",
            paragraphs: [
                "The site sets no cookies unless you allow analytics. It asks once, and remembers your answer in your browser’s local storage.",
                "If you allow it, Google Analytics 4 counts page views and clicks on links and buttons, such as “Contact me” or the Toptal badge, along with your approximate location, device and browser. It sets two cookies, _ga and _ga_ followed by an ID, which last up to two years. Google Ireland Limited processes this data for me; Google Analytics 4 does not log or store IP addresses, and its advertising features stay off. Reports are kept for up to 14 months. The legal basis is your consent (GDPR Article 6(1)(a)).",
                "You can change your answer at any time with “Cookie settings” at the bottom of the home page. Withdrawing it deletes the cookies."
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
