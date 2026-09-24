import { contact } from "@/content/contact";
import { site } from "@/content/site";

import { ContactForm } from "./ContactForm";
import { Section } from "./Section";
import { ToptalBadge } from "./ToptalBadge";

export function Contact() {
    return (
        <Section id="contact">
            <p>{contact.intro}</p>
            <ContactForm />
            <noscript>
                <p className="mt-6 text-sm text-ink-strong">{contact.noScript}</p>
            </noscript>
            <p className="mt-8 text-sm">
                {contact.emailPrompt}{" "}
                <a
                    className="font-medium text-ink-strong underline decoration-ink-faint/50 underline-offset-4 hover:text-accent"
                    href={`mailto:${site.email}`}
                    data-track="email_click"
                    data-track-placement="contact"
                >
                    {site.email}
                </a>
                .
            </p>
            <div className="mt-12 flex flex-col items-start gap-6 border-t border-ink-faint/20 pt-10 sm:flex-row sm:items-center sm:gap-8">
                <ToptalBadge />
                <div>
                    <h3 className="font-medium text-ink-strong">{contact.toptalHeading}</h3>
                    <p className="mt-2 text-sm leading-normal">{contact.toptalText}</p>
                </div>
            </div>
        </Section>
    );
}
