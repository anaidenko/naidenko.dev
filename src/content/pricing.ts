import { type OrderId, orders } from "@/content/orders";

/**
 * /audit's prices, on naidenko.dev only: the Toptal build renders none of it (a client met through
 * Toptal works through Toptal, Talent Agreement §2(h)). Only the page's server component imports
 * this file, so no price reaches a script. Sources per sentence: paste-sheet 13.
 */
export interface Package {
    id: OrderId;
    name: string;
    /** Andrii, 2026-10-11: Valletta Software's published tiers as the first version (paste-sheet 13). */
    price: string;
    scope: string;
    time: string;
    fit: string;
    items: readonly string[];
    cta: string;
    recommended?: boolean;
}

const order = (id: OrderId) => `/?order=${id}#contact`;

export const pricing = {
    title: "Prices",
    lead: "A fixed price for a fixed scope, confirmed before you pay. Send me a link to your repository, or a few lines about your product, and I reply within one business day with the package that fits.",
    languages:
        "For code in JavaScript and TypeScript: front end, back end and mobile. Other languages in the same repository are named in the report as not covered.",
    packages: [
        {
            id: "launch",
            name: orders.launch,
            price: "$199",
            scope: "One repository, up to 5,000 lines of code",
            time: "In 3 business days",
            fit: "An MVP before its first users.",
            cta: "Order a launch check",
            items: [
                "Security, secrets in the git history and vulnerable dependencies",
                "Two more aspects of your choice",
                "The report as HTML and PDF, the Markdown for AI agents and the issue drafts",
                "Answers to your questions about the findings, by email"
            ]
        },
        {
            id: "full",
            name: orders.full,
            price: "$799",
            scope: "Up to 25,000 lines in up to two repositories",
            time: "In 5 business days",
            fit: "A product with paying users, or one about to change hands.",
            cta: "Order a full audit",
            recommended: true,
            items: [
                "Everything in the launch check",
                "Every aspect your stack calls for",
                "A front end and its API read together",
                "A 30-minute call to walk through the findings",
                "A re-audit of the findings to fix before sign-off, within 60 days"
            ]
        },
        {
            id: "diligence",
            name: orders.diligence,
            price: "$1,499",
            scope: "Up to 100,000 lines in up to three repositories",
            time: "In 7 business days",
            fit: "Before a fundraise, an acquisition, or a new team taking over.",
            cta: "Order due diligence",
            items: [
                "Everything in the full audit",
                "A one-page summary for investors or a buyer",
                "A 60-minute call with your team",
                "A re-audit of every finding, within 60 days"
            ]
        }
    ] satisfies readonly Package[],
    recommended: "Recommended",
    href: order,
    custom: {
        id: "custom" as const,
        name: orders.custom,
        price: "Quote",
        text: "A larger codebase, more repositories, re-audits at every milestone, or an audit on your own Anthropic API key: send the repository, and you get a fixed quote within one business day.",
        cta: "Ask for a quote"
    },
    note: "Prices in US dollars, before VAT where it applies. Lines of code count your own source, not your dependencies.",
    faq: {
        title: "Questions before you order",
        items: [
            {
                q: "What do you need from me?",
                a: "Read access to the repository, or an archive of it, and a few lines on what the product does and what worries you. I need no access to your servers or your data."
            },
            {
                q: "What if my codebase is bigger than the package?",
                a: "I say so before you pay, and quote the package that fits."
            },
            {
                q: "How do I pay?",
                a: "Up front, once I have confirmed the package, and you get an invoice."
            },
            {
                q: "Do you fix the findings?",
                a: "The packages are the audit itself. Your team, or your AI agent with the Markdown file, can work from the report; I can also take on the fixes as separate work, quoted after the report."
            },
            {
                q: "Will you sign an NDA?",
                a: "Yes. If your policy calls for it, the audit also runs on your own Anthropic API key."
            }
        ]
    }
};
